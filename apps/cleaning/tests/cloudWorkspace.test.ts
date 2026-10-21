// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyPlan } from '../src/model';
import { STORAGE_KEY } from '../src/storage';
import { accountKey } from '../src/cloudSync';
const mocks=vi.hoisted(()=>({listener:null as null|((event:string,session:unknown)=>void),getSession:vi.fn(),load:vi.fn(),save:vi.fn()}));
vi.mock('../src/cloudClient',()=>({cloudClient:{auth:{getSession:mocks.getSession,onAuthStateChange:(listener:typeof mocks.listener)=>{mocks.listener=listener;return {data:{subscription:{unsubscribe:()=>{mocks.listener=null;}}}};},signOut:vi.fn(async()=>({error:null}))}},cloudApi:()=>({load:mocks.load,save:mocks.save})}));
import CloudWorkspace from '../src/CloudWorkspace';
let root:Root;let container:HTMLDivElement;
const session=(id:string)=>({user:{id,email:`${id}@example.invalid`}});
async function mount(){await act(async()=>{root.render(React.createElement(CloudWorkspace));});}
function click(text:string){const b=Array.from(container.querySelectorAll('button')).find(b=>b.textContent===text);expect(b).toBeDefined();act(()=>b!.click());}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();mocks.load.mockReset().mockResolvedValue(null);mocks.save.mockReset().mockImplementation(async(plan,revision)=>({plan,revision:revision+1,updated_at:'2026-10-21T12:00:00Z'}));mocks.getSession.mockReset().mockResolvedValue({data:{session:session('first')}});container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);});
afterEach(()=>{act(()=>root.unmount());container.remove();localStorage.clear();vi.restoreAllMocks();});
it('requires explicit import and preserves the original browser plan',async()=>{
 const legacy={...emptyPlan(),spaces:[{id:'legacy',name:'Original room',archived:false}]};localStorage.setItem(STORAGE_KEY,JSON.stringify(legacy));await mount();expect(localStorage.getItem(accountKey('first'))).toBeNull();expect(container.textContent).toContain('original browser-only');
 await act(async()=>click('Add this browser’s plan to my account'));
 expect(JSON.parse(localStorage.getItem(accountKey('first'))!).spaces[0].name).toBe('Original room');expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(legacy));expect(mocks.save).toHaveBeenCalledOnce();
});
it('switches device caches when account changes without copying the previous plan',async()=>{
 localStorage.setItem(accountKey('first'),JSON.stringify({...emptyPlan(),spaces:[{id:'first',name:'Private first room',archived:false}]}));await mount();
 await act(async()=>mocks.listener?.('SIGNED_IN',session('second')));
 expect(container.textContent).toContain('second@example.invalid');expect(localStorage.getItem(accountKey('second'))).toBeNull();expect(container.querySelector('main')!.textContent).not.toContain('Private first room');
});
