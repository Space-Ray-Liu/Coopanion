import {createRequire} from 'node:module';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const {createSystemSource,fanControls,linuxFan,linuxGpu}=require('../packages/cortico-world-desktop-pet/host/system-state.cjs');
const dirs=[];
afterEach(async()=>{for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
async function hwmon(){const root=await mkdtemp(join(tmpdir(),'holo-hwmon-'));dirs.push(root);await mkdir(join(root,'hwmon0'));return root;}
const cpu=(idle,user)=>[{times:{idle,user,nice:0,sys:0,irq:0}}];

describe('desktop activity and hardware sampling',()=>{
 it('reads actual fan controls and leaves missing, invalid and non-fan sensors unavailable',()=>{
  expect(fanControls(JSON.stringify([{Name:'CPU Fan',Value:88},{Name:'GPU Fan',Value:40},{Name:'GPU Core',Value:100}]))).toBe(.88);
  expect(fanControls(JSON.stringify({Name:'Fan #1',Value:0}))).toBe(0);
  for(const raw of ['', '{}', '[{"Name":"Fan","Value":null}]','[{"Name":"Fan","Value":150}]','[{"Name":"Core","Value":90}]'])expect(fanControls(raw)).toBeNull();
 });
 it('uses a rated fan maximum and does not treat an observed peak as a maximum',async()=>{
  const root=await hwmon();
  await writeFile(join(root,'hwmon0','fan1_input'),'1800\n');
  expect(await linuxFan(root)).toBeNull();
  await writeFile(join(root,'hwmon0','fan1_max'),'2000\n');
  expect(await linuxFan(root)).toBe(.9);
  await writeFile(join(root,'hwmon0','fan1_input'),'0\n');
  expect(await linuxFan(root)).toBe(0);
 });
 it('samples system-wide CPU busy time and real idle seconds without fabricating fan data',async()=>{
  const root=await hwmon();let times=cpu(100,100),clock=0;
  await mkdir(join(root,'card0','device'),{recursive:true});await writeFile(join(root,'card0','device','gpu_busy_percent'),'70\n');
  const source=createSystemSource({platform:'linux',hwmonRoot:root,drmRoot:root,cpuTimes:()=>times,powerMonitor:{getSystemIdleTime:()=>180},now:()=>clock});
  times=cpu(110,190);clock=2000;
  expect(await source.read()).toMatchObject({idleSeconds:180,cpuLoad:.9,gpuLoad:.7,fanFraction:null});
  source.close();expect(await source.read()).toBeNull();
 });
 it('queries Windows monitors without a console window, bounds execution and stops an in-flight query',async()=>{
  let options,argv,killed=false;
  const source=createSystemSource({platform:'win32',cpuTimes:()=>cpu(0,0),powerMonitor:{getSystemIdleTime:()=>0},run:(program,args,opts,callback)=>{
   expect(program).toBe('powershell.exe');options=opts;argv=args;
   return {kill(){killed=true;callback(new Error('closed'),'');}};
  }});
  const reading=source.read();expect(options.windowsHide).toBe(true);expect(options.timeout).toBeLessThan(5000);
  expect(argv).toContain('-NonInteractive');source.close();expect(killed).toBe(true);expect(await reading).toBeNull();
 });
 it('keeps unavailable Windows fan data unavailable and caches failed probes',async()=>{
  let queries=0;
  const source=createSystemSource({platform:'win32',cpuTimes:()=>cpu(0,0),now:()=>2000,run:(program,args,opts,done)=>{queries++;queueMicrotask(()=>done(new Error('namespace missing'),''));return {kill(){}};}});
  expect((await source.read()).fanFraction).toBeNull();const first=queries;
  expect((await source.read()).fanFraction).toBeNull();expect(queries).toBe(first);source.close();
 });
 it('reads NVIDIA utilization and uses the busiest physical GPU',async()=>{
  const source=createSystemSource({platform:'win32',cpuTimes:()=>cpu(0,0),run:(program,args,options,done)=>{
   queueMicrotask(()=>done(null,program==='nvidia-smi'?'12\n94\n':'[]'));return {kill(){}};
  }});
  expect((await source.read()).gpuLoad).toBe(.94);source.close();
 });
 it('uses Windows GPU engine counters when the NVIDIA command is unavailable',async()=>{
  const source=createSystemSource({platform:'win32',cpuTimes:()=>cpu(0,0),run:(program,args,options,done)=>{
   queueMicrotask(()=>program==='nvidia-smi'?done(Object.assign(new Error('missing'),{code:'ENOENT'}),''):done(null,args.at(-1).includes('GPUEngine')?'91':'[]'));return {kill(){}};
  }});
  expect((await source.read()).gpuLoad).toBe(.91);source.close();
 });
});
