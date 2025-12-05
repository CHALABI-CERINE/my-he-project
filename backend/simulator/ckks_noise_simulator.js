/**
 * SIMULATEUR DE BRUIT CKKS
 * Converti en ES Module
 */

export function simulateCKKS(data, scaleBits) {
    const scale = Math.pow(2, scaleBits);
    const noiseMagnitude = 100; // Bruit arbitraire pour la simulation

    let realSum = 0;
    let noisySum = 0;

    data.forEach(val => {
        realSum += val;
        const error = (Math.random() * noiseMagnitude - (noiseMagnitude/2)) / scale;
        noisySum += (val + error);
    });

    const realAvg = realSum / data.length;
    const noisyAvg = noisySum / data.length;

    const absoluteError = Math.abs(realAvg - noisyAvg);
    const relativeError = (absoluteError / Math.abs(realAvg)) * 100;

    return {
        scaleBits,
        realAvg,
        noisyAvg,
        mae: absoluteError.toExponential(5),
        mre: relativeError.toFixed(6) + "%",
        isAcceptable: relativeError < 0.01
    };
}