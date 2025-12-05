/**
 * SIMULATEUR D'OPTIMISATION
 * Converti en ES Module
 */

const COST_ADD = 1;
const COST_ROT = 20;

export function analyzeStrategies(numElements, slotCount) {
  console.log(`\n📊 ANALYSE POUR N=${numElements} éléments (Slots=${slotCount})`);

  const results = [];

  // 1. BINAIRE (BASELINE)
  const stepsBinary = Math.ceil(Math.log2(numElements));
  results.push({
    name: "Binary Reduction (Standard)",
    rotations: stepsBinary,
    additions: stepsBinary,
    totalCost: (stepsBinary * COST_ROT) + (stepsBinary * COST_ADD),
    desc: "Logarithmique O(log n). Idéal quand N < Slots."
  });

  // 2. LINÉAIRE
  results.push({
    name: "Linear Aggregation (No Pack)",
    rotations: 0,
    additions: numElements - 1,
    totalCost: 0 * COST_ROT + (numElements - 1) * COST_ADD,
    desc: "Linéaire O(n). 0 Rotations mais beaucoup d'additions."
  });

  // 3. BLOCK-WISE
  const blockSize = 8;
  const numBlocks = Math.ceil(numElements / blockSize);
  const stepsPerBlock = Math.ceil(Math.log2(blockSize));
  
  const totalRotBlock = stepsPerBlock * numBlocks;
  const totalAddBlock = (stepsPerBlock * numBlocks) + (numBlocks - 1);
  
  results.push({
    name: `Block-Wise (Size ${blockSize})`,
    rotations: totalRotBlock,
    additions: totalAddBlock,
    totalCost: (totalRotBlock * COST_ROT) + (totalAddBlock * COST_ADD),
    desc: "Hybride. Idéal pour paralléliser les gros datasets."
  });

  const winner = results.reduce((prev, curr) => prev.totalCost < curr.totalCost ? prev : curr);

  return {
    inputs: { numElements, slotCount },
    strategies: results,
    recommendation: winner.name
  };
}