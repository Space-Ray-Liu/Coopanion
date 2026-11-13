/** Read-only desktop activity and hardware samples, requested by a figure's `system` capability. */
const { cpus } = require('node:os');
const { execFile } = require('node:child_process');
const { readdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');
const fraction = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.min(1, n) : null;
const totalCpu = values => values.reduce((sum,cpu)=>({idle:sum.idle+cpu.times.idle,total:sum.total+Object.values(cpu.times).reduce((a,b)=>a+b,0)}),{idle:0,total:0});

function fanControls(text) {
  try {
    const data=JSON.parse(text), rows=Array.isArray(data)?data:[data];
    const values=rows.filter(row=>/fan/i.test(String(row?.Name)) && typeof row.Value==='number' && row.Value>=0 && row.Value<=100).map(row=>row.Value/100);
    return values.length?Math.max(...values):null;
  } catch { return null; }
}
async function linuxFan(root='/sys/class/hwmon') {
  const values=[];
  for(const dir of await readdir(root).catch(()=>[])){
    const base=join(root,dir), files=await readdir(base).catch(()=>[]);
    for(const name of files.filter(name=>/^fan\d+_input$/.test(name))){
      const [rpm,max]=await Promise.all([readFile(join(base,name),'utf8').then(Number).catch(()=>NaN),readFile(join(base,name.replace('_input','_max')),'utf8').then(Number).catch(()=>NaN)]);
      if(Number.isFinite(rpm)&&rpm>=0&&Number.isFinite(max)&&max>0)values.push(fraction(rpm/max));
    }
  }
  return values.length?Math.max(...values):null;
}
const FAN_QUERY = "$ErrorActionPreference='SilentlyContinue'; $s=foreach($n in @('root\\LibreHardwareMonitor','root\\OpenHardwareMonitor')){Get-CimInstance -Namespace $n -ClassName Sensor -Filter \"SensorType='Control'\" -ErrorAction SilentlyContinue}; @($s | Where-Object {$_.Name -match 'Fan'} | Select-Object Name,Value) | ConvertTo-Json -Compress";
const GPU_QUERY = "$ErrorActionPreference='SilentlyContinue'; $g=Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue; if($g){$v=$g | Group-Object { $_.Name -replace '^pid_\\d+_','' } | ForEach-Object {($_.Group | Measure-Object UtilizationPercentage -Sum).Sum} | Measure-Object -Maximum; [Math]::Min(100,$v.Maximum) | ConvertTo-Json -Compress}";
const percent = text => {const n=Number(String(text).trim());return String(text).trim()&&Number.isFinite(n)&&n>=0&&n<=100?n/100:null;};
async function linuxGpu(root='/sys/class/drm'){
  const values=[];
  for(const dir of (await readdir(root).catch(()=>[])).filter(name=>/^card\d+$/.test(name))){
    const value=await readFile(join(root,dir,'device','gpu_busy_percent'),'utf8').then(percent).catch(()=>null);
    if(value!==null)values.push(value);
  }
  return values.length?Math.max(...values):null;
}

function createSystemSource({powerMonitor,platform=process.platform,cpuTimes=cpus,hwmonRoot,drmRoot,run=execFile,now=Date.now}={}){
  let previous=totalCpu(cpuTimes()),closed=false,child=null,fan=null,fanAt=-Infinity,gpu=null,gpuAt=-Infinity,noNvidia=false;
  const command=(program,args)=>new Promise(resolve=>{
    if(closed){resolve(null);return;}
    child=run(program,args,{windowsHide:true,timeout:2500,maxBuffer:16384,encoding:'utf8'},(error,stdout)=>{
      child=null;if(program==='nvidia-smi'&&error?.code==='ENOENT')noNvidia=true;resolve(error?null:stdout);
    });
  });
  const windowsCommand=script=>command('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script]);
  return {
    async read(){
      if(closed)return null;
      const current=totalCpu(cpuTimes()), delta=current.total-previous.total;
      const cpuLoad=delta>0?fraction(1-(current.idle-previous.idle)/delta):null;previous=current;
      let idleSeconds=null;
      try{const idle=powerMonitor?.getSystemIdleTime();if(Number.isFinite(idle)&&idle>=0)idleSeconds=idle;}catch{}
      if(now()-fanAt>=(fan===null?60000:10000)){
        fanAt=now();
        fan=platform==='win32'?fanControls(await windowsCommand(FAN_QUERY)):platform==='linux'?await linuxFan(hwmonRoot):null;
      }
      if(!closed&&now()-gpuAt>=5000){
        gpuAt=now();gpu=platform==='linux'?await linuxGpu(drmRoot):null;
        if(gpu===null&&!noNvidia&&(platform==='win32'||platform==='linux')){
          const rows=await command('nvidia-smi',['--query-gpu=utilization.gpu','--format=csv,noheader,nounits']);
          const values=rows===null?[]:rows.split(/\r?\n/).map(percent).filter(n=>n!==null);
          gpu=values.length?Math.max(...values):null;
        }
        if(!closed&&gpu===null&&platform==='win32')gpu=percent(await windowsCommand(GPU_QUERY)??'');
      }
      return closed?null:{idleSeconds,cpuLoad,gpuLoad:gpu,fanFraction:fan,sampledAt:now()};
    },
    close(){closed=true;child?.kill();child=null;},
  };
}
module.exports={createSystemSource,fanControls,linuxFan,linuxGpu};
