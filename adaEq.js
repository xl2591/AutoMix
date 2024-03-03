
import { fftUtil } from "./fftUtil.js";

class AdaEq extends AudioWorkletProcessor {

  constructor(options) {
    super();

    this.G = [1.0, 1.0, 1.0, 1.41, 1.41];
    this.sampleRate = sampleRate;
    this.K = 128;
    this.inputSize = options.numberOfInputs;

    this.binFrequencyWidth = sampleRate / 2 / this.K;
    this.fftutil = new fftUtil();

    this.peakAcummulation = new Float32Array(this.K);
    for (var i = 0; i < this.peakAcummulation.length; i++) {
      this.peakAcummulation[i] = 0;
    }

    this.ESP = 1e-5;
    this.smoothAlpha = 0.8;

    // peak lufs
    this.fixedLufs = -20;
    this.peakFadeRate = 1.000;
    this.accumulatePeakLuf = new Array(this.inputSize);
    for (var i = 0; i < this.accumulatePeakLuf.length; i++) {

      this.accumulatePeakLuf[i] = -100;
    }

    this.preGain = new Array(this.inputSize);
    for (var i = 0; i < this.preGain.length; i++) {
      this.preGain[i] = 1;
    }
  }
  /*
  
    frequencyWeights(fftSize) {
    
      const deltaF = 22050 * 2 / fftSize;
      const frequencyBinCount = fftSize / 2;
      let arr = new Array(frequencyBinCount).fill().map((_, index) => {
          return index * deltaF;
      });
  
      const c1 = Math.pow(12194.217, 2);∂r
      const c2 = Math.pow(20.598997, 2);
      const c3 = Math.pow(107.65265, 2);
      const c4 = Math.pow(737.86223, 2);
  
      const num = arr.map((item) => {
            return item * c1 * item;
        });
  
        const den = arr.map((item) => {
            return (item + c2) * Math.sqrt((item + c3) * (item + c4)) * (item + c1);
        });
  
        const weights = num.map((item, index) => {
            return 1.2589 * item / den[index];
        });
  
        return weights;
    }
    */

  aWeights(f) {
    var f2 = f * f;
    return 1.2588966 * 148840000 * f2 * f2 /
      ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000));
  }

  loudness(buffer, gain) {

    let sum = 0;
    let bufferSize = buffer.length;
    for (let i = 0; i < bufferSize; i++) {
      sum += buffer[i] * buffer[i] * gain * gain;
    }
    let z0 = sum / bufferSize;
    if (z0 < this.ESP) {
      return -100;
    }

    let lufs = -0.691 + 10.0 * Math.log10(this.G[0] * z0);
    lufs = Math.max(-100, lufs);

    return lufs;
  }

  KBand(input, K) {

    let inputSize = input.length;

    let phasors = this.fftutil.fft(input);
    let realOutput = new Float32Array(K);
    let imgOutput = new Float32Array(K);

    let binSize = Math.round(input.length / 2 / K);

    for (let i = 0; i < input.length / 2; i += binSize) {
      realOutput[i] = 0;
      imgOutput[i] = 0;
      for (let j = 0; j < binSize; j++) {
        realOutput[i] += phasors['real'][i + j];
        imgOutput[i] += phasors['imag'][i + j];
      }
    }

    return { "real": realOutput, "imag": imgOutput }
  }

  meanSquare(buffer, gain) {
    let sum = 0;
    let bufferSize = buffer.length;
    for (let i = 0; i < bufferSize; i++) {
      sum += buffer[i] * buffer[i] * gain * gain;
    }
    return sum / bufferSize;
  }

  // assume n input, 1 channel processing 
  process(inputs, outputs, parameters) {
    if (inputs == undefined || inputs[0] == undefined || inputs[0][0] == undefined) {
      return true;
    }
    let blockSize = inputs[0][0].length;

    // if (this.kkk > 50) {
    //   return false;
    // }

    for (var i = 0; i < this.inputSize; i++) {

      if (inputs[i][0] == undefined) {
        continue
      }
      let lufs = this.loudness(inputs[i][0], 1);
      var gain = this.preGain[i];

      // check peak
      var iterTime = 0;
      this.accumulatePeakLuf[i] = this.accumulatePeakLuf[i] * this.peakFadeRate;

      if (lufs > this.accumulatePeakLuf[i] && lufs > -100) {

        this.accumulatePeakLuf[i] = lufs;
        // binary search gain
        var gainStart = 0.01, ginaEnd = 20;
        var iterTime = 0;

        while (Math.abs(lufs - this.fixedLufs) > this.ESP && iterTime < 40) {

          iterTime++;

          gain = (gainStart + ginaEnd) / 2;
          lufs = this.loudness(inputs[i][0], gain);

          if (lufs > this.fixedLufs) {
            ginaEnd = gain;
          } else {
            gainStart = gain;
          }
          // console.log(gain)
        }
      }

      this.preGain[i] = gain;


      for (var j = 0; j < outputs[i][0].length; j++) {
        outputs[i][0][j] = inputs[i][0][j] * gain;
      }

    }

    // for(var i = 0;i < this.inputSize; i++) {
    //   console.log(this.preGain[i]);
    // }
    // console.log("ccc");


    // smooth
    /*
    for (var j = 1; j < blockSize; j++) {
      outputs[0][0][j] = this.smoothAlpha * outputs[0][0][j] + (1 - this.smoothAlpha) * outputs[0][0][j - 1];
    }
    */

    return true;
  }
}

registerProcessor("AdaEq", AdaEq);