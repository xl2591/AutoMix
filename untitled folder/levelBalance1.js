import { fftUtil } from "../fftUtil.js";
class levelBalance extends AudioWorkletProcessor {

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
    this.fixedLufs = -30;
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
    // console.log(lufs);
    return lufs;
  
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
    if (inputs == undefined || inputs[0].length == 0) {
      return true;
    }

 //console.log(inputs)
   
    let blockSize = inputs[0][0].length;


    // if (this.kkk > 50) {
    //   return false;
    // }

    for (var i = 0; i < this.inputSize; i++) {

      if (inputs[i].length == 0) {
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

    return true;
  }
}

registerProcessor("levelBalance", levelBalance);