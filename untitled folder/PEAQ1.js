//Masking measurement


import { fftUtil } from "../fftUtil.js";

class PEAQ extends AudioWorkletProcessor {

  constructor(options) {
    super(options);



    // Init
    this.inputSize = options.numberOfInputs;
    this.inputChanelSize = options.inChannelCount;
    this.outputSize = options.numberOfOutputs;
    this.outChanelSize = options.outputChannelCount;
    this.totalBuffer = new Array(this.outputSize).fill(new Array(this.outputChannelCount).fill(new Float32Array()));


    this.cnt = 0;
    this.delta
    this.aL = Math.pow(10, (-2.7 * this.delta));
    this.Amax = 32768;
    this.LP = 92;
    this.kfs = 48000; //Fs
    this.NF = 2048; //long window
    this.TOF = 0.000001
    this.Tmax = 20;

    // fixed by AudioWorkletProcessor
    this.blockSize = 128;

    // buffer
    this.bufferInput = new Array(this.inputSize).fill(new Array(this.inChannelCount).fill(new Float32Array()));
    this.bufferOutput = new Array(this.outputSize).fill(new Array(this.outputChannelCount).fill(new Float32Array()));
    this.totalBuffer = new Array;

    this.tao100 = 0.030;//long window
    this.taoMin = 0.008;//long window
    this.zl = 0.8594;
    this.Fss = this.kfs / (this.NF / 2);
    this.fftutil = new fftUtil();


    // hanning window
    this.hanningConst = Math.sqrt(8 / 3);
    this.hanningV = new Float32Array(this.NF)
    for (var i = 0; i < this.NF; i++) {
      this.hanningV[i] = 0.5 - 0.5 * (Math.cos((2 * Math.PI * i) / (this.NF - 1)))
    }

    // critical bands
    this.Nc = 109
    this.EfPre = new Array(this.Nc).fill(0)
    this.fl = [80.000, 103.445, 127.023, 150.762, 174.694,
      198.849, 223.257, 247.950, 272.959, 298.317,
      324.055, 350.207, 376.805, 403.884, 431.478,
      459.622, 488.353, 517.707, 547.721, 578.434,
      609.885, 642.114, 675.161, 709.071, 743.884,
      779.647, 816.404, 854.203, 893.091, 933.119,
      974.336, 1016.797, 1060.555, 1105.666, 1152.187,
      1200.178, 1249.700, 1300.816, 1353.592, 1408.094,
      1464.392, 1522.559, 1582.668, 1644.795, 1709.021,
      1775.427, 1844.098, 1915.121, 1988.587, 2064.590,
      2143.227, 2224.597, 2308.806, 2395.959, 2486.169,
      2579.551, 2676.223, 2776.309, 2879.937, 2987.238,
      3098.350, 3213.415, 3332.579, 3455.993, 3583.817,
      3716.212, 3853.817, 3995.399, 4142.547, 4294.979,
      4452.890, 4616.482, 4785.962, 4961.548, 5143.463,
      5331.939, 5527.217, 5729.545, 5939.183, 6156.396,
      6381.463, 6614.671, 6856.316, 7106.708, 7366.166,
      7635.020, 7913.614, 8202.302, 8501.454, 8811.450,
      9132.688, 9465.574, 9810.536, 10168.013, 10538.460,
      10922.351, 11320.175, 11732.438, 12159.670, 12602.412,
      13061.229, 13536.710, 14029.458, 14540.103, 15069.295,
      15617.710, 16186.049, 16775.035, 17385.420];
    this.fc = [91.708, 115.216, 138.870, 162.702, 186.742,
      211.019, 235.566, 260.413, 285.593, 311.136,
      337.077, 363.448, 390.282, 417.614, 445.479,
      473.912, 502.950, 532.629, 562.988, 594.065,
      625.899, 658.533, 692.006, 726.362, 761.644,
      797.898, 835.170, 873.508, 912.959, 953.576,
      995.408, 1038.511, 1082.938, 1128.746, 1175.995,
      1224.744, 1275.055, 1326.992, 1380.623, 1436.014,
      1493.237, 1552.366, 1613.474, 1676.641, 1741.946,
      1809.474, 1879.310, 1951.543, 2026.266, 2103.573,
      2183.564, 2266.340, 2352.008, 2440.675, 2532.456,
      2627.468, 2725.832, 2827.672, 2933.120, 3042.309,
      3155.379, 3272.475, 3393.745, 3519.344, 3649.432,
      3784.176, 3923.748, 4068.324, 4218.090, 4373.237,
      4533.963, 4700.473, 4872.978, 5051.700, 5236.866,
      5428.712, 5627.484, 5833.434, 6046.825, 6267.931,
      6497.031, 6734.420, 6980.399, 7235.284, 7499.397,
      7773.077, 8056.673, 8350.547, 8655.072, 8970.639,
      9297.648, 9636.520, 9987.683, 10351.586, 10728.695,
      11119.490, 11524.470, 11944.149, 12379.066, 12829.775,
      13294.850, 13780.887, 14282.503, 14802.338, 15341.057,
      15899.345, 16477.914, 17077.504, 17690.045]
    this.fu = [103.445, 127.023, 150.762, 174.694, 198.849,
      223.257, 247.950, 272.959, 298.317, 324.055,
      350.207, 376.805, 403.884, 431.478, 459.622,
      488.353, 517.707, 547.721, 578.434, 609.885,
      642.114, 675.161, 709.071, 743.884, 779.647,
      816.404, 854.203, 893.091, 933.113, 974.336,
      1016.797, 1060.555, 1105.666, 1152.187, 1200.178,
      1249.700, 1300.816, 1353.592, 1408.094, 1464.392,
      1522.559, 1582.668, 1644.795, 1709.021, 1775.427,
      1844.098, 1915.121, 1988.587, 2064.590, 2143.227,
      2224.597, 2308.806, 2395.959, 2486.169, 2579.551,
      2676.223, 2776.309, 2879.937, 2987.238, 3098.350,
      3213.415, 3332.579, 3455.993, 3583.817, 3716.212,
      3853.348, 3995.399, 4142.547, 4294.979, 4452.890,
      4643.482, 4785.962, 4961.548, 5143.463, 5331.939,
      5527.217, 5729.545, 5939.183, 6156.396, 6381.463,
      6614.671, 6856.316, 7106.708, 7366.166, 7635.020,
      7913.614, 8202.302, 8501.454, 8811.450, 9132.688,
      9465.574, 9810.536, 10168.013, 10538.460, 10922.351,
      11320.175, 11732.438, 12159.670, 12602.412, 13061.229,
      13536.710, 14029.458, 14540.103, 15069.295, 15617.710,
      16186.049, 16775.035, 17385.420, 18000.000];

    this.kl = []
    var index = 0;
    for (var i = 0; i < this.Nc; i++) {
      var topF = index * this.kfs / this.NF + this.kfs / this.NF;

      while (this.fl[i] > topF) {
        index++;
        topF += this.kfs / this.NF;
      }
      this.kl[i] = index;
    }

    index = 0;
    this.ku = []
    for (var i = 0; i < this.Nc; i++) {
      var topF = index * this.kfs / this.NF + this.kfs / this.NF;

      while (this.fu[i] > topF) {
        index++;
        topF += this.kfs / this.NF;
      }
      this.ku[i] = index
    }
  }

  // Hann Window
  hanning(n) {
    if (n > this.NF - 1 || n < 0) {
      return 0
    } else {
      return this.hanningConst * this.hanningV[n];
    }
  }

  //Sound pressure 
  SPL(buffer, gain) {

    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.max(Math.sqrt(rms / buffer.length), 0.00002)

    return 20 * Math.log10(rms / 0.00002); // 0.00002 Pa is the reference pressure level
  }

  //centre frequency
  r(fc) {
    return 0.84947
  }
  //Adb
  Adb(fhz) {
    let r1 = -2.184 * Math.pow((fhz / 1000), -0.8)
    let r2 = 6.5 * Math.pow(Math.E, -0.6 * (fhz / 1000 - 3.3) ** 2);
    let r3 = 0.001 * Math.pow(fhz / 1000, 3.6);

    return r1 + r2 - r3;
  }

  // WK
  Wk(k) {
    if (k < 0 || k > this.NF / 2) {
      return 0
    }

    return Math.pow(10, this.Adb(k * this.kfs / this.NF) / 20);
  }

  // center frequency factor -> (0.84, 1)
  centerFFactor = function (xk) {

    var index = xk.length / 2;

    var res = 0;
    var sum = 0;
    for (var i = 1; i < xk.length; i++) {
      res += Math.abs(xk[i]) / (Math.abs(i - index) + 1);
      sum += Math.abs(xk[i]);
    }

    if (sum == 0) {
      return 1;
    }
    return res / sum * 0.16 + 0.84;

  }

  //Outer/MiddleEarTransferModel
  GL(LP, Xk) {
    return Math.pow(10, (LP / 20)) / (this.centerFFactor(Xk) * Math.sqrt(8 / 3) * (this.Amax / 4) * ((this.NF - 1) * 1.0 / this.NF));
  }

  weighting(LP, Xk) {

    let GLValue = this.GL(LP, Xk);
    let xwk = new Float32Array(this.NF);
    for (let i = 0; i <= this.NF / 2; i++) {
      xwk[i] = GLValue * this.Wk(i) * (Xk[i]);

    }

    return xwk
  }
  //FrequencyGrouping

  U(i, k) {

    let minValue = Math.min(this.fu[i], (2 * k + 1) / 2 * (this.kfs / this.NF))
    let maxValue = Math.max(this.fl[i], (2 * k - 1) / 2 * (this.kfs / this.NF))

    return (Math.max(0, (minValue - maxValue))) / (this.kfs / this.NF)
  }

  Ul(i) {
    var res = this.U(i, this.kl[i]);
    for (var k = this.kl[i]; k <= this.ku[i]; k++) {
      res = Math.min(res, this.U(i, k));
    }
    return res;
  }


  Uh(i) {
    var res = this.U(i, this.kl[i]);
    for (var k = this.kl[i]; k <= this.ku[i]; k++) {
      res = Math.max(res, this.U(i, k));
    }
    return res;
  }

  Eb(xwk) {
    // Upper limit,lowerlimit and bin in band i respectively
    let resArray = [];
    for (let i = 0; i < this.Nc; i++) {

      let Ul = this.Ul(i) * (xwk[this.kl[i]] ** 2)
      let Uh = this.Uh(i) * (xwk[this.ku[i]] ** 2)

      let res = Ul + Uh;

      for (let j = this.kl[i] + 1; j <= this.ku[i] - 1; j++) {
        res += Math.abs(xwk[j]) ** 2;
      }
      resArray[i] = Math.max(res, 10 ** -12)
    }
    return resArray;
  }


  //InternalNoise
  InterNoise() {
    let noiseArray = [];

    for (var i = 0; i < this.Nc; i++) {

      let M = Math.pow(this.fc[i] / 1000, -0.8)
      let EIN = Math.pow(10, 0.1456 * M)

      noiseArray[i] = EIN
    }
    return noiseArray
  }


  //EnergySpreadingofFrequencyDomain
  Sdb(i, l, E) {

    // i, l should be frency in unit of bark
    var ilDiff = this.bark(this.fc[i]) - this.bark(this.fc[l])
    if (E[i] == 0) {
      return 0;
    }
    if (i <= l) {
      return 27 * ilDiff * this.delta
    }
    else {
      return (-24 - 230 / this.fc[l] + 2 * Math.log10(E[i])) * ilDiff * this.delta
    }
  }




  A(l, E) {

    for (let i = 0; i <= Nc; i++) {

      aUCEe = Array(this.Nc).fill(0);
      Ene = Array(this.Nc).fill(0);
      let aUC = Math.pow(10, (-2.4 - 23 / fc[i + 1]) * this.delta);
      let aUCE = aUC * Math.pow(E[i + 1], 0.2 * this.delta);
      let gIL = (1 - Math.pow(this.aL, i + 1)) / (1 - this.aL);
      let gIU = (1 - Math.pow(aUCE, this.Nc - m)) / (1 - aUCE);
      let En = E[i + 1] / (gIL + gIU - 1);
      let aUCEe = Math.pow(aUCE, Math.E);
      let Ene = Math.pow(En, Math.E);
    };


  };


  S(i, l, E) {

    // i, l should be frency in unit of bark
    var ilDiff = this.bark(this.fc[i]) - this.bark(this.fc[l])

    if (i <= l) {
      return Math.pow(10, 2.7 * (ilDiff)) / this.A(l, E)
    }
    else {

      return Math.pow(Math.pow(10, -2.4 + (-23 / this.fc[l])) * Math.pow(E[i], 0.2), ilDiff) / this.A(l, E)
    }
  }

  PQ_SpreadCB = function (E, Bs) {
    var e = 0.4;
    var Nc = E.length;
    var dz = 1.0 / Nc;
    var fc = [];
    var aUCEe = [];
    var Ene = [];
    var Es = [];

    // Calculate fc
    for (var i = 0; i < Nc; i++) {
      fc[i] = 25 * (i + 1) + 100;
    }

    // Calculate energy-dependent terms
    var aL = Math.pow(10, 2.7 * dz);

    for (var l = 0; l < Nc; l++) {
      var aUC = Math.pow(10, (-2.4 - 23 / fc[l]) * dz);
      var aUCE = aUC * Math.pow(E[l], 0.2 * dz);
      var gIL = (1 - Math.pow(aL, -(l + 1))) / (1 - Math.pow(aL, -1));
      var gIU = (1 - Math.pow(aUCE, Nc - l)) / (1 - aUCE);
      var En = E[l] / (gIL + gIU - 1);
      aUCEe[l] = Math.pow(aUCE, e);
      Ene[l] = Math.pow(En, e);
    }

    // Lower spreading
    Es[Nc - 1] = Ene[Nc - 1];
    var aLe = Math.pow(aL, -e);
    for (var i = Nc - 2; i >= 0; i--) {
      Es[i] = aLe * Es[i + 1] + Ene[i];
    }

    // Upper spreading (i > m)
    for (var i = 0; i < Nc - 1; i++) {
      var r = Ene[i];
      var a = aUCEe[i];
      for (var l = i + 1; l < Nc; l++) {
        r *= a;
        Es[l] += r;
      }
    }

    // Normalize the values by the normalization factor
    for (var i = 0; i < Nc; i++) {
      Es[i] = Math.pow(Es[i], 1 / e) / Bs[i];
    }

    return Es;
  }

  Es2(E) {

    var Bs = this.PQ_SpreadCB(new Array(this.Nc).fill(1), new Array(this.Nc).fill(1))
    return this.PQ_SpreadCB(E, Bs)
  }


  Es(E) {

    //lower spreading 
    var Esvalue = Array(this.Nc).fill(0);
    var Ene = [];
    Esvalue[this.Nc - 1 + 1] = Ene[this.Nc - 1 + 1];

    let aLe = Math.pow(this.aL, Math.E);

    for (let m = Nc - 2; m >= 0; m--) {
      Esvalue[m + 1] = aLe * Esvalue[m + 1 + 1] + Ene[m + 1];
    }

    //uper spreading 
    // Assuming variables Nc, Es, Ene, and aUCEe have been defined beforehand

    for (let m = 0; m <= this.Nc - 1; m++) {
      let r = Ene[m + 1];
      let a = aUCEe[m + 1];
      for (let i = m + 1; i <= this.Nc; i++) {
        r = r * a;
        Esvalue[i + 1] = Es[i + 1] + r;
      }
    }

    for (let i = 0; i < Nc; i++) {
      Esvalue[i + 1] = Math.pow(Esvalue[i + 1], 1 / Math.E) / Bs[i + 1];
    }
  }
  // Es(E) {
  //   var esValue = [];

  //   var Ale = []
  //   for (var l = 0; l < this.Nc; l++) {

  //     Ale[l] = 0
  //     for (var i = 0; i < this.Nc; i++) {
  //       Ale[l] += this.Sdb(i, l, E)
  //     }
  //     Ale[l] *= 0.1
  //   }


  //   for (var i = 0; i < this.Nc; i++) {
  //     var res = 0;

  //     var a = new Array(l).fill(0);
  //     var b = new Array(l).fill(0);
  //     for (var l = 0; l < this.Nc; l++) {

  //       var v3 = Ale[l]
  //       var v1 = 2.7
  //       var v2 = this.bark(this.fc[i]) - this.bark(this.fc[l])
  //       if (i >= l) {
  //         v1 = -2.4 - 23 / this.fc[l] + 0.2 * Math.log10(E[i])
  //       }

  //       a[l] = v1 * v2 - v3 + Math.log10(E[l])
  //       b[l] = v1 * v2 - v3

  //     }

  //     var maxV = Math.max(...b)
  //     // in case of too little value calculation

  //     a = a.map((val) => { return val - maxV });
  //     b = b.map((val) => { return val - maxV });

  //     var aa = 0;
  //     var bb = 0;
  //     for (var l = 0; l < this.Nc; l++) {
  //       aa += (10 ** a[l]) ** 0.4
  //       bb += (10 ** b[l]) ** 0.4

  //     }

  //     esValue[i] = (aa / bb) ** 2.5
  //   }

  //   return esValue;
  // };

  Bs(i, E) {
    let res = 0;
    for (var l = 0; l < this.Nc; l++) {
      res += Math.pow(this.S(i, l, E), 0.4)
    }
    return Math.pow(res, 2.5)
  }

  //TimeDomainSpreading
  tao(i) {
    return this.taoMin + 100 / this.fc[i] * (this.tao100 - this.taoMin)
  }
  alpha(i) {
    var t = Math.pow(Math.E, -1 / (this.Fss * this.tao(i)))
    return t;
  }

  Ef = function (Es) {

    var Ef = new Array(this.Nc)
    for (var i = 0; i < this.Nc; i++) {
      Ef[i] = Math.max(this.alpha(i) * this.EfPre[i] + (1 - this.alpha(i)) * Es[i], Es[i]);
      this.EfPre[i] = Ef[i];
    }

    return Ef
  }

  bark = function (f) {
    return 13 * Math.atan(0.76 * f / 1000) + 3.5 * Math.atan((f / 7500) ** 2)
  }

  //CalculationofMaskingParameters
  m(f) {
    var z = this.bark(f)
    if (z <= this.zl + 12) {
      return 3

    } else { return 0.25 * (z - this.zl) }
  }

  EMask(Ef) {

    return Ef.map((val, i) => {
      return Math.max(val - this.m(this.fc[i]), 0)
    });
  }

  
  array32Concat = function (arr1, arr2) {


    return [...arr1, ...arr2]
  }


  peaqWork = function (newinputs) {

    if (newinputs.length < this.NF) {
      return [];
    }
    newinputs = newinputs.slice(0, this.NF)


    //add hanning window 
    for (let i = 0; i < newinputs.length; i++) {
      newinputs[i] = this.hanning(i) * newinputs[i];
    }

    // console.log(newinputs)

    //FFT
    let FftOutput = this.fftutil.fft(newinputs).real

    // console.log(FftOutput)

    //Outer/MiddleEarTransferModel
    let xwk = this.weighting(this.LP, FftOutput)
    // console.log(xwk)

    //frequency grouping
    let eb = this.Eb(xwk)
    // console.log(eb)

    // internal noise
    let norise = this.InterNoise();
    // console.log("norise: " + norise);

    //EnergySpreadingofFrequencyDomain
    let E_final = eb.map((val, i) => { return val; })

    let E_s = this.Es2(E_final)
    // console.log("E_s: " + E_s);

    // TimeDomainSpreading
    var E_f = this.Ef(E_s)
    //  console.log("E_f: " + E_f);

    // Masking
    var E_mask = this.EMask(E_f)
    // console.log("E_mask: " + E_mask);

    //max vluae 

    // const myString = JSON.stringify(E_mask);
    // let numArr = myString.split(",").map(x => parseFloat(x)).filter(x => !isNaN(x));
    // let max = Math.max(...numArr);
    // console.log(max);
    // get the max value type
    // console.log(typeof myString)

    return E_mask;

  }



  testComare = function (raw, out) {

    var rawFFt = this.fftutil.fft(raw)

    var a = 0;
    for (var i = 0; i < rawFFt.real.length; i++) {

      var rawValue = Math.sqrt(rawFFt.real[i] ** 2 + rawFFt.imag[i] ** 2) * 0.00002
      var outValue = Math.sqrt(out.real[i] ** 2 + out.imag[i] ** 2)
    }
  }


  calculateEnergy = function (audioBuffer) {
    let energy = 0;
    const buffer = audioBuffer // 获取音频缓冲区的左声道数据

    for (let i = 0; i < this.NF; i++) {

      energy += Math.pow(buffer[i], 2); // 平方和
    }

    return energy;
  }
  //process 参考adaeq
  //input [][][] inputs number, input channel(left and right), input time domain dtat
  process(inputs, outputs, parameters) {
    if (inputs == undefined || inputs[0] == undefined || inputs[0][0] == undefined) {
      return true;
    }


    // if (this.cnt > 800) {
    //   return;
    // }
    this.cnt++;


    // console.log(inputs.length)

    // process inputbuffer (controll the value of masking)
    // bufer
    for (var i = 0; i < inputs.length; i++) {
      this.bufferInput[i][0] = this.array32Concat(this.bufferInput[i][0], inputs[i][0])
    }



    // check buffer is enough
    var bufferOk = true;
    for (var i = 0; i < inputs.length; i++) {
      if (this.bufferInput[i][0].length < this.NF) {
        bufferOk = false
      }
    }


    // cal acoomanpy sum & peaq
    var maskRes = new Array(inputs.length);
    var energy = new Array(inputs.length);

    if (bufferOk) {

      // get sum
      var bufferSum = new Array(this.NF).fill(0);
      for (var i = 0; i < this.NF; i++) {// windows

        for (var j = 0; j < inputs.length; j++) { // track
          bufferSum[i] += this.bufferInput[j][0][i];
        }
      }

      for (var i = 0; i < inputs.length; i++) {

        // get accompany sum
        var accomanpySum = [...bufferSum];

        for (var j = 0; j < this.NF; j++) {
          accomanpySum[j] -= this.bufferInput[i][0][j];
        }

        // console.log(i)
        // console.log(inputs[i][0])
        // console.log(this.bufferInput[i][0])
        // console.log("qqqq")

        // peaq
        maskRes[i] = this.peaqWork(accomanpySum)
        // console.log(i)
        // console.log(this.bufferInput[i][0])
        // console.log("qqqq")
        energy[i] = this.calculateEnergy(this.bufferInput[i][0])

        //MSR[i] = this.peaqWork(this.bufferInput[i][0]) 

        // console.log(this.bufferInput[0][0])
        // console.log(this.bufferInput[1][0])
        // console.log(this.bufferInput[2][0])

        //  console.log(maskRes[i])
        // console.log(energy[i])
        //  console.log("------")

        //masking threshold
        var MSR = [];

        for (var j = 0; j < maskRes[i].length; j++) {
          var result = 0;
          if (energy[i] > this.TOF && maskRes[i][j] > this.TOF) {
            result = 10 * Math.log10(maskRes[i][j] / energy[i]);
          }
          MSR.push(result)
        }

        //Max value
        const myString = JSON.stringify(maskRes[i]);
        let numArr = myString.split(",").map(x => parseFloat(x)).filter(x => !isNaN(x));
    

        // console.log(maskRes[i])
        // console.log(energy[i])
        // console.log(MSR)
        //Total masking for tracks 

        let MnSb = MSR.map(x => { return x / this.Tmax})
        let Mn = MnSb.reduce((a, b) => a + b, 0);

      

        //console.log(Mn)
        
        this.port.postMessage({ "key": i, "value": maskRes[i], "energy": energy[i], "Mn": Mn });

        // consume buffer

      }
    }

    if (bufferOk) {
      for (var i = 0; i < inputs.length; i++) {
        this.bufferInput[i][0] = this.bufferInput[i][0].slice(this.NF)
      }
    }
    for (var i = 0; i < inputs.length; i++) {

      for (var j = 0; j < outputs[i][0].length; j++) {
        outputs[i][0][j] = inputs[i][0][j]
      }
      this.bufferOutput[i][0] = this.bufferOutput[i][0].slice(this.blockSize);
    }


    return true;
  }

}

registerProcessor("PEAQ", PEAQ);
