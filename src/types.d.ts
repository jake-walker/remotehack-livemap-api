import { Context } from 'hono';

export type Context = Context<{ Bindings: Env }>;
