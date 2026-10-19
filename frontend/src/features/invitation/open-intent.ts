/** One in-flight intent per invitation, shared across StrictMode/remounts.
 * A failed payload fetch retries state first, never blindly records another open.
 * No private payload is cached after the request settles.
 */
export function createOpenIntent<T>(request:<R>(path:string,method?:string)=>Promise<R>){
 const pending=new Map<string,Promise<T>>();
 return (id:string):Promise<T>=>{
  const existing=pending.get(id);if(existing)return existing;
  const task=(async()=>{
   const path=`/guest/invitations/${id}`;
   const state=await request<{opened:boolean}>(`${path}/state`);
   if(!state.opened)await request(`${path}/open`,'POST');
   return request<T>(path);
  })();
  pending.set(id,task);
  void task.finally(()=>{if(pending.get(id)===task)pending.delete(id);}).catch(()=>{});
  return task;
 };
}