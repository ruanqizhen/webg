import type { NodeDefinition } from '../types/runtime';
import { runtimeLog } from '../store/useLogStore';

function formatLogValue(value: any): string {
  if (value === undefined || value === null) return String(value);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

export const NodeRegistry: Record<string, NodeDefinition> = {
  // Sources
  'source.number': {
    type: 'source.number',
    label: 'Number Constant',
    inputs: [],
    outputs: [{ name: 'value', type: 'number' }],
    params: [{ name: 'value', type: 'number', defaultValue: 0 }],
    executor: (ctx) => ({ outputs: { value: Number(ctx.params.value) } })
  },
  'source.boolean': {
    type: 'source.boolean',
    label: 'Boolean Constant',
    inputs: [],
    outputs: [{ name: 'value', type: 'boolean' }],
    params: [{ name: 'value', type: 'boolean', defaultValue: false }],
    executor: (ctx) => ({ outputs: { value: Boolean(ctx.params.value) } })
  },
  'source.string': {
    type: 'source.string',
    label: 'String Constant',
    inputs: [],
    outputs: [{ name: 'value', type: 'string' }],
    params: [{ name: 'value', type: 'string', defaultValue: '' }],
    executor: (ctx) => ({ outputs: { value: String(ctx.params.value) } })
  },
  'source.array': {
    type: 'source.array',
    label: 'Array Constant',
    inputs: [],
    outputs: [{ name: 'value', type: 'array' }],
    params: [{ name: 'value', type: 'array', defaultValue: [] }],
    executor: (ctx) => {
      let arr = ctx.params.value;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { arr = []; }
      }
      if (!Array.isArray(arr)) arr = [];
      return { outputs: { value: arr } };
    }
  },

  // Math
  'math.add': {
    type: 'math.add',
    label: 'Add',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A ?? 0) + Number(ctx.inputs.B ?? 0) } })
  },
  'math.subtract': {
    type: 'math.subtract',
    label: 'Subtract',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A ?? 0) - Number(ctx.inputs.B ?? 0) } })
  },
  'math.multiply': {
    type: 'math.multiply',
    label: 'Multiply',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A ?? 0) * Number(ctx.inputs.B ?? 1) } })
  },
  'math.divide': {
    type: 'math.divide',
    label: 'Divide',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => {
      const b = Number(ctx.inputs.B);
      if (!isFinite(b) || b === 0) throw new Error("Division by zero");
      const a = Number(ctx.inputs.A);
      if (!isFinite(a)) throw new Error("Invalid dividend: not a finite number");
      return { outputs: { result: a / b } };
    }
  },
  'math.sin': {
    type: 'math.sin',
    label: 'Sine',
    inputs: [{ name: 'x', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Math.sin(Number(ctx.inputs.x ?? 0)) } })
  },
  'math.cos': {
    type: 'math.cos',
    label: 'Cosine',
    inputs: [{ name: 'x', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Math.cos(Number(ctx.inputs.x ?? 0)) } })
  },
  'math.tan': {
    type: 'math.tan',
    label: 'Tangent',
    inputs: [{ name: 'x', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Math.tan(Number(ctx.inputs.x ?? 0)) } })
  },
  'math.sqrt': {
    type: 'math.sqrt',
    label: 'Square Root',
    inputs: [{ name: 'x', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => {
      const x = Number(ctx.inputs.x ?? 0);
      if (!isFinite(x)) throw new Error("Invalid input: not a finite number");
      if (x < 0) throw new Error("Square root of negative number");
      return { outputs: { result: Math.sqrt(x) } };
    }
  },
  'math.pow': {
    type: 'math.pow',
    label: 'Power',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Math.pow(Number(ctx.inputs.A ?? 0), Number(ctx.inputs.B ?? 0)) } })
  },
  'math.abs': {
    type: 'math.abs',
    label: 'Absolute',
    inputs: [{ name: 'x', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Math.abs(Number(ctx.inputs.x ?? 0)) } })
  },

  // Logic
  'logic.greater': {
    type: 'logic.greater',
    label: 'Greater',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'boolean' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A) > Number(ctx.inputs.B) } })
  },
  'logic.less': {
    type: 'logic.less',
    label: 'Less',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'boolean' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A) < Number(ctx.inputs.B) } })
  },
  'logic.equal': {
    type: 'logic.equal',
    label: 'Equal',
    inputs: [{ name: 'A', type: 'any' }, { name: 'B', type: 'any' }],
    outputs: [{ name: 'result', type: 'boolean' }],
    executor: (ctx) => ({ outputs: { result: ctx.inputs.A === ctx.inputs.B } })
  },
  'logic.and': {
    type: 'logic.and',
    label: 'And',
    inputs: [{ name: 'A', type: 'boolean' }, { name: 'B', type: 'boolean' }],
    outputs: [{ name: 'result', type: 'boolean' }],
    executor: (ctx) => ({ outputs: { result: Boolean(ctx.inputs.A) && Boolean(ctx.inputs.B) } })
  },
  'logic.or': {
    type: 'logic.or',
    label: 'Or',
    inputs: [{ name: 'A', type: 'boolean' }, { name: 'B', type: 'boolean' }],
    outputs: [{ name: 'result', type: 'boolean' }],
    executor: (ctx) => ({ outputs: { result: Boolean(ctx.inputs.A) || Boolean(ctx.inputs.B) } })
  },
  'logic.not': {
    type: 'logic.not',
    label: 'Not',
    inputs: [{ name: 'A', type: 'boolean' }],
    outputs: [{ name: 'result', type: 'boolean' }],
    executor: (ctx) => ({ outputs: { result: !Boolean(ctx.inputs.A) } })
  },

  // String
  'string.concat': {
    type: 'string.concat',
    label: 'Concatenate',
    inputs: [{ name: 'A', type: 'string' }, { name: 'B', type: 'string' }],
    outputs: [{ name: 'result', type: 'string' }],
    executor: (ctx) => ({ outputs: { result: String(ctx.inputs.A ?? '') + String(ctx.inputs.B ?? '') } })
  },
  'string.length': {
    type: 'string.length',
    label: 'String Length',
    inputs: [{ name: 's', type: 'string' }],
    outputs: [{ name: 'length', type: 'integer' }],
    executor: (ctx) => ({ outputs: { length: String(ctx.inputs.s ?? '').length } })
  },
  'string.substring': {
    type: 'string.substring',
    label: 'Substring',
    inputs: [{ name: 's', type: 'string' }, { name: 'start', type: 'integer' }, { name: 'length', type: 'integer' }],
    outputs: [{ name: 'result', type: 'string' }],
    executor: (ctx) => {
      const s = String(ctx.inputs.s ?? '');
      const start = Math.max(0, Math.trunc(Number(ctx.inputs.start ?? 0)));
      const lenRaw = ctx.inputs.length;
      if (lenRaw === undefined || lenRaw === '') return { outputs: { result: s.slice(start) } };
      const len = Math.max(0, Math.trunc(Number(lenRaw)));
      return { outputs: { result: s.slice(start, start + len) } };
    }
  },
  'string.uppercase': {
    type: 'string.uppercase',
    label: 'To Uppercase',
    inputs: [{ name: 's', type: 'string' }],
    outputs: [{ name: 'result', type: 'string' }],
    executor: (ctx) => ({ outputs: { result: String(ctx.inputs.s ?? '').toUpperCase() } })
  },
  'string.lowercase': {
    type: 'string.lowercase',
    label: 'To Lowercase',
    inputs: [{ name: 's', type: 'string' }],
    outputs: [{ name: 'result', type: 'string' }],
    executor: (ctx) => ({ outputs: { result: String(ctx.inputs.s ?? '').toLowerCase() } })
  },

  // Array
  'array.length': {
    type: 'array.length',
    label: 'Array Length',
    inputs: [{ name: 'array', type: 'array' }],
    outputs: [{ name: 'length', type: 'integer' }],
    executor: (ctx) => {
      const arr = ctx.inputs.array;
      return { outputs: { length: Array.isArray(arr) ? arr.length : 0 } };
    }
  },
  'array.index': {
    type: 'array.index',
    label: 'Index Array',
    inputs: [{ name: 'array', type: 'array' }, { name: 'index', type: 'integer' }],
    outputs: [{ name: 'element', type: 'any' }],
    executor: (ctx) => {
      const arr = ctx.inputs.array;
      const i = Math.trunc(Number(ctx.inputs.index ?? 0));
      const el = Array.isArray(arr) && i >= 0 && i < arr.length ? arr[i] : undefined;
      return { outputs: { element: el } };
    }
  },
  'array.append': {
    type: 'array.append',
    label: 'Append to Array',
    inputs: [{ name: 'array', type: 'array' }, { name: 'element', type: 'any' }],
    outputs: [{ name: 'result', type: 'array' }],
    executor: (ctx) => {
      const arr = Array.isArray(ctx.inputs.array) ? ctx.inputs.array : [];
      return { outputs: { result: [...arr, ctx.inputs.element] } };
    }
  },

  // Random
  'random.uniform': {
    type: 'random.uniform',
    label: 'Random Uniform',
    inputs: [],
    outputs: [{ name: 'value', type: 'number' }],
    params: [
      { name: 'min', type: 'number', defaultValue: 0 },
      { name: 'max', type: 'number', defaultValue: 1 },
      { name: 'integer', type: 'boolean', defaultValue: false }
    ],
    executor: (ctx) => {
      const lo = Math.min(Number(ctx.params.min ?? 0), Number(ctx.params.max ?? 1));
      const hi = Math.max(Number(ctx.params.min ?? 0), Number(ctx.params.max ?? 1));
      const v = lo + Math.random() * (hi - lo);
      return { outputs: { value: ctx.params.integer ? Math.floor(v) : v } };
    }
  },

  // Time
  'time.wait': {
    type: 'time.wait',
    label: 'Wait (ms)',
    inputs: [{ name: 'ms', type: 'number' }],
    outputs: [{ name: 'done', type: 'boolean' }],
    params: [{ name: 'defaultMs', type: 'number', defaultValue: 1000 }],
    executor: async (ctx) => {
      const raw = ctx.inputs.ms !== undefined ? ctx.inputs.ms : (ctx.params.defaultMs ?? 1000);
      const ms = Math.max(0, Number(raw));
      await new Promise<void>((r) => setTimeout(r, ms));
      return { outputs: { done: true } };
    }
  },
  'time.now': {
    type: 'time.now',
    label: 'Timestamp',
    inputs: [],
    outputs: [{ name: 'timestamp', type: 'number' }],
    executor: () => ({ outputs: { timestamp: Date.now() } })
  },

  // Sink
  'sink.display': {
    type: 'sink.display',
    label: 'Display',
    inputs: [{ name: 'value', type: 'any' }],
    outputs: [{ name: 'pass_through', type: 'any' }],
    executor: (ctx) => {
      runtimeLog(formatLogValue(ctx.inputs.value), 'info', ctx.nodeId, 'Display');
      return { outputs: { pass_through: ctx.inputs.value } };
    }
  },
  'sink.log': {
    type: 'sink.log',
    label: 'Console Log',
    inputs: [{ name: 'value', type: 'any' }],
    outputs: [],
    executor: (ctx) => {
      runtimeLog(formatLogValue(ctx.inputs.value), 'log', ctx.nodeId, 'Console Log');
      return { outputs: {} };
    }
  },

  // IO Terminals
  'io.terminal': {
    type: 'io.terminal',
    label: 'Terminal',
    // Port definition will be dynamic during runtime, but we provide mock ports for compatibility 
    // Usually handled dynamically when building context in graph editor
    inputs: [{ name: 'input', type: 'any' }],
    outputs: [{ name: 'output', type: 'any' }],
     executor: (ctx) => {
       // Terminal logic: For controls, value is already injected into outputs by initialization.
       // For indicators, value received on input is the outcome.
       return { outputs: { output: ctx.inputs.input !== undefined ? ctx.inputs.input : ctx.params.value } };
    }
  },

  // Structures & Tunnels
  'io.tunnel': {
    type: 'io.tunnel',
    label: 'Tunnel',
    inputs: [{ id: 'input', name: 'input', type: 'any', direction: 'input' }],
    outputs: [{ id: 'output', name: 'output', type: 'any', direction: 'output' }],
    executor: async (ctx) => {
      return { outputs: { output: ctx.inputs.input } };
    }
  },
  'io.shiftRegister': {
    type: 'io.shiftRegister',
    label: 'Shift Register',
    inputs: [{ id: 'input', name: 'input', type: 'any', direction: 'input' }],
    outputs: [{ id: 'output', name: 'output', type: 'any', direction: 'output' }],
    executor: async (ctx) => {
      return { outputs: { output: ctx.inputs.input } };
    }
  },
  'structure.forLoop': {
    type: 'structure.forLoop',
    label: 'For Loop',
    inputs: [
      { id: 'N', name: 'N', type: 'integer', direction: 'input' },
      { id: 'conditional', name: 'conditional', type: 'boolean', direction: 'input', isInternal: true }
    ],
    outputs: [{ id: 'i', name: 'i', type: 'integer', direction: 'output', isInternal: true }],
    params: [
      { name: 'hasConditional', type: 'boolean', defaultValue: false },
      { name: 'conditionalMode', type: 'string', defaultValue: 'stopIfTrue' },
      { name: 'maxIterations', type: 'number', defaultValue: 0 }
    ],
    executor: async (_ctx) => { return { outputs: {} }; } // Driven by scheduler
  },
  'structure.whileLoop': {
    type: 'structure.whileLoop',
    label: 'While Loop',
    inputs: [{ id: 'stop', name: 'stop', type: 'boolean', direction: 'input', isInternal: true }],
    outputs: [{ id: 'i', name: 'i', type: 'integer', direction: 'output', isInternal: true }],
    params: [
      { name: 'conditionMode', type: 'string', defaultValue: 'stopIfTrue' },
      { name: 'maxIterations', type: 'number', defaultValue: 100000 }
    ],
    executor: async (_ctx) => { return { outputs: {} }; } // Driven by scheduler
  },
  'structure.case': {
    type: 'structure.case',
    label: 'Case Structure',
    inputs: [{ id: 'selector', name: 'selector', type: 'boolean', direction: 'input' }],
    outputs: [],
    params: [
      { name: 'mode', type: 'string', defaultValue: 'boolean' }, // 'boolean' or 'number'
      { name: 'cases', type: 'array', defaultValue: ['true', 'false'] }, // case names/labels
      { name: 'defaultCase', type: 'string', defaultValue: 'false' }, // default case for number mode
      { name: 'activeCase', type: 'string', defaultValue: 'true' } // currently selected case for editing
    ],
    executor: async (_ctx) => { return { outputs: {} }; } // Driven by scheduler
  }
};
