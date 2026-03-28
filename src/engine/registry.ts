import type { NodeDefinition } from '../types/runtime';

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

  // Math
  'math.add': {
    type: 'math.add',
    label: 'Add',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A) + Number(ctx.inputs.B) } })
  },
  'math.subtract': {
    type: 'math.subtract',
    label: 'Subtract',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A) - Number(ctx.inputs.B) } })
  },
  'math.multiply': {
    type: 'math.multiply',
    label: 'Multiply',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => ({ outputs: { result: Number(ctx.inputs.A) * Number(ctx.inputs.B) } })
  },
  'math.divide': {
    type: 'math.divide',
    label: 'Divide',
    inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
    outputs: [{ name: 'result', type: 'number' }],
    executor: (ctx) => {
      const b = Number(ctx.inputs.B);
      if (b === 0) throw new Error("Division by zero");
      return { outputs: { result: Number(ctx.inputs.A) / b } };
    }
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

  // Sink
  'sink.display': {
    type: 'sink.display',
    label: 'Display',
    inputs: [{ name: 'value', type: 'any' }],
    outputs: [{ name: 'pass_through', type: 'any' }], // useful if we want to daisy-chain
    executor: (ctx) => {
      // Logic for indicator UI update is handled by the execution engine tracking 'pass_through' 
      // or we can emit an event. Returning the value means the node finishes.
      return { outputs: { pass_through: ctx.inputs.value } };
    }
  },
  'sink.log': {
    type: 'sink.log',
    label: 'Log',
    inputs: [{ name: 'value', type: 'any' }],
    outputs: [],
    executor: (ctx) => {
      console.log(`[Node Log ${ctx.nodeId}]:`, ctx.inputs.value);
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
  'structure.forLoop': {
    type: 'structure.forLoop',
    label: 'For Loop',
    inputs: [{ id: 'N', name: 'N', type: 'number', direction: 'input' }],
    outputs: [{ id: 'i', name: 'i', type: 'number', direction: 'output' }],
    params: [],
    executor: async (_ctx) => { return { outputs: {} }; } // Driven by scheduler
  },
  'structure.whileLoop': {
    type: 'structure.whileLoop',
    label: 'While Loop',
    inputs: [{ id: 'stop', name: 'stop', type: 'boolean', direction: 'input' }],
    outputs: [],
    params: [],
    executor: async (_ctx) => { return { outputs: {} }; } // Driven by scheduler
  },
  'structure.case': {
    type: 'structure.case',
    label: 'Case Structure',
    inputs: [{ id: 'selector', name: 'selector', type: 'any', direction: 'input' }],
    outputs: [],
    params: [{ name: 'activeCase', type: 'string', defaultValue: 'true' }],
    executor: async (_ctx) => { return { outputs: {} }; } // Driven by scheduler
  }
};
