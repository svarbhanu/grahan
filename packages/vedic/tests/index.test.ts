import { describe, expect, it } from 'vitest';
import { engineInfo } from '../src/index.js';

describe('@grahan/vedic placeholder', () => {
  it('links to @grahan/core through the workspace', () => {
    expect(engineInfo()).toEqual({ vedic: '0.0.0', core: '0.0.0' });
  });
});
