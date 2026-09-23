import { describe, test, expect, mock, beforeEach } from "bun:test";
const reads = mock(async () => []);
const create = mock((args: unknown) => Promise.resolve(args));
const transaction = mock(async (args: unknown[]) => Promise.all(args));
const ai = mock(async () => ({content:[{type:"text",text:"Review the blocked task with its owner."}]}));
const forbidden = mock(() => { throw new Error("Roadmap writes forbidden"); });
const model = {findMany:reads,create:forbidden,update:forbidden,delete:forbidden};
mock.module("@/lib/db", () => ({requirePrisma:()=>({quarter:model,item:model,meeting:model,person:model,phase:model,chatLog:{findMany:reads,create},$transaction:transaction})}));
mock.module("@anthropic-ai/sdk", () => ({default:class {messages={create:ai}}}));
const {POST}=await import("./route");
describe("advisory roadmap assistant",()=>{
 beforeEach(()=>{process.env.ANTHROPIC_API_KEY="test-only";for(const m of [reads,create,transaction,ai,forbidden])m.mockClear()});
 test("answers a destructive request without writing roadmap records",async()=>{
  const r=await POST(new Request("http://localhost/api/chat",{method:"POST",body:JSON.stringify({message:"Delete all tasks and reset progress",readOnly:false})}));
  expect(r.status).toBe(200);expect((await r.json()).applied).toBe(0);expect(forbidden).not.toHaveBeenCalled();expect(create).toHaveBeenCalledTimes(2);expect(transaction).toHaveBeenCalledTimes(1);
 });
 test("rejects empty messages before database or AI calls",async()=>{
  const r=await POST(new Request("http://localhost/api/chat",{method:"POST",body:JSON.stringify({message:"  "})}));expect(r.status).toBe(400);expect(reads).not.toHaveBeenCalled();expect(ai).not.toHaveBeenCalled();
 });
 test("handles malformed JSON",async()=>{const r=await POST(new Request("http://localhost/api/chat",{method:"POST",body:"{"}));expect(r.status).toBe(400)});
 test("reports missing configuration without writing history",async()=>{delete process.env.ANTHROPIC_API_KEY;const r=await POST(new Request("http://localhost/api/chat",{method:"POST",body:JSON.stringify({message:"Help"})}));expect(r.status).toBe(503);expect(create).not.toHaveBeenCalled()});
});
