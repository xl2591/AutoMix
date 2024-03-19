
window.onload = async () => {
  const playBtn = document.querySelector("#play-btn");
  const playBtn0 = document.querySelector("#play-btn0")
  const stopBtn = document.getElementById("stop-btn");
  const selectBtn = document.getElementById("audio-select");
  const panX0 = document.getElementById("panX0");
  const panY0 = document.getElementById("panY0");
  const panZ0 = document.getElementById("panZ0");
  const Threshold = document.getElementById("Threshold");
  const Ratio = document.getElementById("Ratio");
  const Attack = document.getElementById("Attack");
  const Release = document.getElementById("Release");
  const gain0 = document.getElementById("gain0");
  const gain1 = document.getElementById("gain1");
  const gain2 = document.getElementById("gain2");
  const gain3 = document.getElementById("gain3");
  const gain4 = document.getElementById("gain4");
  const gain5 = document.getElementById("gain5");
  const gain6 = document.getElementById("gain6");
  const gain7 = document.getElementById("gain7");
  const saveAudio1 = document.getElementById("audio1");
  const saveAudio2 = document.getElementById("audio2");
  const saveAudio3 = document.getElementById("audio3");
  const saveAudio4 = document.getElementById("audio4");
  const saveAudio5 = document.getElementById("audio5");
  const saveAudio6 = document.getElementById("audio6");
  const totalAudio = document.getElementById("audio");
  const trainingBtn = document.getElementById("training");
  const chartElement = document.getElementById('chart');


  // const
  let audioURL = []
  let audios = [];
  let audioDirIndex = 0;
  let pannerPosistions = [];

  let sampleRate = 48000;
  let recorders = [];
  let totalRecorder;
  var TotalM = [];
  let iterCnt = 100;
  let iter = 0;
  let bestFitness = -1;
  let bestXc = { "DRC": [], "PAN": [], "GAIN": [] };
  let bufferMn = new Array();


  let peaqFrameIdx = new Array();
  let peaqFrame = new Array();
  let targetIndex = 70;


  const panners = [panX0, panY0, panZ0]
  const biquadFilterFreqency = [60, 100, 200, 400, 800, 1600,2500,7500];
  const qValues = [1, 0.6, 0.3, 0.3, 0.2, 0.2,0.2,1];
  const gainsButton = [gain0, gain1, gain2, gain3, gain4, gain5,gain6,gain7]
  const saveaudios = [saveAudio1, saveAudio2, saveAudio3,saveAudio4,saveAudio5,saveAudio6];

  initAudio()

  function initAudio() {

    let audioDir = "/audio"
    for (let i = 6; i < 8; i += 2) {

      let subDir = audioDir + "/" + i.toString()

      let audioList = []
      for (let j = 1; j <= i; j++) {
        audioList.push(subDir + "/" + j.toString() + ".wav")
      }
      audioURL.push(audioList)
    }
    peaq = new Array(audioURL[0].length).fill(0);
    peaqCnt = new Array(audioURL[0].length).fill(0);
    peaqFrameIdx = new Array(audioURL[0].length).fill(0);
    peaqFrame = new Array(audioURL[0].length)
    bufferMn = new Array(audioURL[0].length);
    for (var i = 0; i < bufferMn.length; i++) {
      bufferMn[i] = new Array();
    }

    pannerPosistions = new Array(audioURL[0].length).fill(undefined);
    TotalM = new Array(audioURL[0].length).fill(0);

    selectBtn.addEventListener("change", function () {
      audioDirIndex = parseInt(selectBtn.value)
      var inputSize = audioURL[audioDirIndex].length;
      TotalM = new Array(inputSize).fill(0);
      peaqFrameIdx = new Array(inputSize).fill(0);
      peaqFrame = new Array(inputSize);


      bufferMn = new Array(inputSize);
      peaqFrameIdx = new Array(inputSize).fill(0);
      peaqFrame = new Array(inputSize).fill(0);

      for (var i = 0; i < inputSize; i++) {
        bufferMn[i] = new Array();
      }
    })



  }

  function playSound(context, isplayOriginal) {

    var inputSize = audioURL[audioDirIndex].length;

    //EQ node 
    var peakFilters = new Array();
    for (var i = 0; i < inputSize; i++) {
      peakFilters.push(new Array());
    }

    for (var i = 0; i < biquadFilterFreqency.length; i++) {
      for (var j = 0; j < inputSize; j++) {
        var peakFilter = context.createBiquadFilter();

        peakFilter.type = "peaking"; // set the filter type to peaking
        peakFilter.frequency.value = biquadFilterFreqency[i]; // set the center frequency 
        peakFilter.Q.value = qValues[i]; // set the quality factor (Q) 
        // peakFilter.gain.value = 1;
        peakFilters[j].push(peakFilter);
      }
    }

    for (let i = 0; i < gainsButton.length; i++) {
      let t = i;
      gainsButton[i].oninput = () => {
        for (var j = 0; j < inputSize; j++) {
          peakFilters[j][t].gain.value = gainsButton[t].value
        }
      }
    }

    // compress node
    var compressNodes = new Array();
    for (var i = 0; i < inputSize; i++) {
      compressNodes.push(context.createDynamicsCompressor());
    }

    Threshold.oninput = () => compressNodes[0].threshold.value = Threshold.value
    Ratio.oninput = () => compressNodes[0].ratio.value = Ratio.value

    Attack.oninput = () => compressNodes[0].attack.value = Attack.value
    Release.oninput = () => compressNodes[0].release.value = Release.value
    // pan node 
    var panNodes = new Array();
    for (var i = 0; i < inputSize; i++) {
      var panner = context.createPanner()
      panner.refDistance = 0.5
      panner.panningModel = 'HRTF';
      panNodes.push(panner);
    }

    // recording node
    let totalRecordingNode = context.createDynamicsCompressor();
    let recordingNode = new Array();
    for (var i = 0; i < inputSize; i++) {
      recordingNode.push(context.createDynamicsCompressor());
    }
    //gainnode
    const gainNode = new AudioWorkletNode(context, "levelBalance", {

      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize
    })
    // Set the button
    //SPA
    panX0.oninput = () => panNodes[0].positionX.value = panX0.value
    panY0.oninput = () => panNodes[0].positionY.value = panY0.value
    panZ0.oninput = () => panNodes[0].positionZ.value = panZ0.value

    //Gainnode 
    var inChannelCount = new Array(inputSize);
    var outChannelCount = new Array(inputSize);
    outChannelCount.fill(1);//声道个数

    // set bestXC
    for (var i = 0; i < inputSize; i++) {

      // set compress param
      compressNodes[i].threshold.value = bestXc.DRC[i][0]
      compressNodes[i].ratio.value = bestXc.DRC[i][1]
      compressNodes[i].attack.value = bestXc.DRC[i][2]
      compressNodes[i].release.value = bestXc.DRC[i][3]
      // set pan param
      panNodes[i].positionX.value = bestXc.PAN[i][0]
      panNodes[i].positionY.value = bestXc.PAN[i][1]
      panNodes[i].positionZ.value = bestXc.PAN[i][2]

      // set gain param
      for (var j = 0; j < 8; j++) {
        peakFilters[i][j].gain.value = bestXc.GAIN[i][j]
      }
    }

    // visualization
    // 获取chart元素
    var pannnerresult = new Array();
    for (var i = 0; i < inputSize; i++) {
      pannnerresult.push(bestXc.PAN[i]);
    }

    let transformedArray = pannnerresult.map(subArray => {
      let firstElement = subArray[0];
      if (Array.isArray(firstElement)) {
        return firstElement.map(String);
      } else if (Array.isArray(subArray)) {
        return subArray.map(String);
      } else {
        return subArray;
      }
    });

    var drcresult = new Array();
    for (var i = 0; i < inputSize; i++) {
      drcresult.push(bestXc.DRC[i]);
    }

    var eqresult = new Array();

    for (var i = 0; i < inputSize; i++) {
      var emptyArray = new Array();
      for (var j = 0; j < 8; j++) {
        emptyArray.push(bestXc.GAIN[i][j]);
      }
      eqresult.push(emptyArray)
    }

    // console.log()
    console.log(transformedArray);
    console.log(drcresult)
    console.log(eqresult)
    
    let source = [
      ['X：X', 'Y：Y', 'Z：Z'],
      ['3', '0', '0'],
      ['-3', '0', '0'],
      ['3', '3', '0'],
    ];
    for (let i = 0; i < transformedArray.length; i++) {
      for (let j = 0; j < transformedArray[i].length; j++) {
        source[i + 1] = transformedArray[i].map(String);
      }
    }


    // 创建echarts实例
    let chart = echarts.init(chartElement);
    chart.setOption({
      grid3D: {
        viewControl: {
          distance: 300
        }
      },

      xAxis3D: {
        name: 'X',
        min: -3,
        max: 3
      },
      yAxis3D: {
        name: 'Y',
        min: -3,
        max: 3
      },
      zAxis3D: {
        name: 'Z',
        min: -3,
        max: 3
      },
      dataset: {
        dimensions: [
          'X：X',
          'Y：Y',
          'Z：Z'
        ],
        source: source
      },
      tooltip: {

      },
      series: [
        {
          name: '',
          type: 'scatter3D',
          symbolSize: 15,
          encode: {
            x: 'X：X',
            y: 'Y：Y',
            z: 'Z：Z',

          }
        }
      ]
    });

    window.onresize = function () {
      chart.resize();
    };


    audioURL[audioDirIndex].forEach(async (url, key) => {
      audios[key] = new Audio(url);

      const source = context.createMediaElementSource(audios[key]);

      if (isplayOriginal) {
        source.connect(context.destination);
      } else {

        // source.connect(compressNodes[key])
        source.connect(gainNode, 0, key);
        gainNode.connect(compressNodes[key], key, 0)
        for (var i = 0; i < peakFilters[key].length; i++) {
          (compressNodes[key]).connect(peakFilters[key][i])
          peakFilters[key][i].connect(panNodes[key]);
        }

        //compressNodes[key].connect(panNodes[key]);
        panNodes[key].connect(recordingNode[key]);
        recordingNode[key].connect(totalRecordingNode);
        totalRecordingNode.connect(context.destination);
      }

      audios[key].play();
    });

    recorders = []
    for (let i = 0; i < inputSize; i++) {
      recorders.push(new Recorder(recordingNode[i]))
      recorders[i].record()
    }
    totalRecorder = new Recorder(totalRecordingNode)
    totalRecorder.record()
  }

  function calcFitness() {
    var mt = 0;

    bufferMn.forEach((x) => {
      console.log(x)
    })
    // mt
    TotalM = TotalM.map(x => (x / bufferMn[0].length) / 2);

    TotalM.forEach((x) => {
      console.log(x)
    })
    TotalM.forEach(x => {
      mt += x * x;
    })
    // md
    var md = 0;
    TotalM.forEach(x => {
      TotalM.forEach(y => {
        md = Math.max(Math.abs(x - y), md)
      })
    })

    return (mt + md);
    // return mt + md;
  }

 

  stopBtn.addEventListener("click", async () => {

    // console.log(audios[0])
    // console.log("==")
    for (let i = 0; i < recorders.length; i++) {
      recorders[i].stop();
      recorders[i].exportWAV(blob => { saveaudios[i].src = URL.createObjectURL(blob) })
    }
    totalRecorder.exportWAV(blob => { totalAudio.src = URL.createObjectURL(blob) })

    audios.forEach(audio => {
      audio.pause();
    })
  });

  playBtn.addEventListener("click", async () => {

    const context = new AudioContext();
    await context.resume();
    await context.audioWorklet.addModule("./PEAQ.js");
    await context.audioWorklet.addModule("./levelBalance.js");

    playSound(context, false);

  });

  playBtn0.addEventListener("click", async () => {
    const context = new AudioContext();

    await context.resume();
    await context.audioWorklet.addModule("./PEAQ.js");
    await context.audioWorklet.addModule("./levelBalance.js");

    playSound(context, true);
  });

  async function training() {

    const context = new OfflineAudioContext(1, 5 * sampleRate, sampleRate);
    // const context = new AudioContext();
    await context.audioWorklet.addModule("./PEAQ.js");
    await context.audioWorklet.addModule("./levelBalance.js");

    var inputSize = audioURL[audioDirIndex].length;

    var inChannelCount = new Array(inputSize);
    var outChannelCount = new Array(inputSize);
    inChannelCount.fill(1); //声道个数
    outChannelCount.fill(1); //声道个数

    // level node 
    const gainNode = new AudioWorkletNode(context, "levelBalance", {

      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize
    })

    // PEAQ node
    const peaqNode = new AudioWorkletNode(context, "PEAQ", {
      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize
    });
    // collect peaq value
    peaqNode.port.onmessage = (event) => {
      var audioData = event.data;
      var peaqValue = audioData.Mn;
      var peaqIndex = audioData.key;

      bufferMn[peaqIndex].push(peaqValue);
      TotalM[peaqIndex] += peaqValue;

      peaqFrameIdx[peaqIndex]++;

      if (peaqFrameIdx[peaqIndex] == targetIndex) {
        peaqFrame[peaqIndex] = audioData.mask
      }
    };


    // gain node
    var peakFilters = new Array();
    for (var i = 0; i < inputSize; i++) {
      peakFilters.push(new Array());
    }
    for (var i = 0; i < biquadFilterFreqency.length; i++) {
      for (var j = 0; j < inputSize; j++) {
        var peakFilter = context.createBiquadFilter();

        peakFilter.type = "peaking"; // set the filter type to peaking
        peakFilter.frequency.value = biquadFilterFreqency[i]; // set the center frequency 
        peakFilter.Q.value = qValues[i]; // set the quality factor (Q) 
        // peakFilter.gain.value = 1;
        peakFilters[j].push(peakFilter);
      }
    }

    // gain slider
    for (let i = 0; i < gainsButton.length; i++) {
      let t = i;
      gainsButton[i].oninput = () => {
        peakFilters[0][t].gain.value = gainsButton[t].value
      }
    }

    // DRC node
    var compressNodes = new Array();
    for (var i = 0; i < inputSize; i++) {
      compressNodes.push(context.createDynamicsCompressor());
    }

    // DRC slider
    Threshold.oninput = () => compressNodes[0].threshold.value = Threshold.value
    Ratio.oninput = () => compressNodes[0].ratio.value = Ratio.value
    Attack.oninput = () => compressNodes[0].attack.value = Attack.value
    Release.oninput = () => compressNodes[0].release.value = Release.value

    // paner node 
    var panNodes = new Array();
    for (var i = 0; i < inputSize; i++) {
      var panner = context.createPanner()
      panner.refDistance = 0.5
      panner.panningModel = 'HRTF';
      panNodes.push(panner);
    }

    // paner silider
    panX0.oninput = () => panNodes[0].positionX.value = panX0.value
    panY0.oninput = () => panNodes[0].positionY.value = panY0.value
    panZ0.oninput = () => panNodes[0].positionZ.value = panZ0.value

    // 1. decode audio seedrand => set seed
    // 2. set seed
    // 3. update slider
    // 4 go to epoch
    let decodedData = new Array(inputSize);
    await Promise.all(audioURL[audioDirIndex].map(async (url, key) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      await context.decodeAudioData(arrayBuffer, (data) => {
        decodedData[key] = data;
      });
    }));

    console.log("decode ok")
    setRandomSeed(compressNodes, panNodes, peakFilters);
    updateSlider(compressNodes, panNodes, peakFilters);
    play(context, decodedData, gainNode, peaqNode, compressNodes, peakFilters, panNodes);
  }
//random seed
  Math.seedrandom("kachy");
  
  // get a random value from [minV, maxV]
  function getRandom(minV, maxV,step) {

    testv = Math.random();
    // const randomInteger = Math.floor(Math.random() *(maxV - minV) / step) + 1;
   const randomInteger = Math.floor(testv*(maxV - minV) / step) + 1;
   console.log("prng"+testv);   
    
     return randomInteger * step + minV;
  }

  // // seed: [0, 10]
  // function getSeed() {
  //   return Math.floor(Math.random() * 10);
  // }

  // set random value for pander, gain, DRC
  function setRandomSeed(compressNodes, panNodes, peakFilters) {
    const PanParameterRange = { min: -3, max: 3 }; // panner
    const EqParameterRange = { min: -15, max: 15 }; // eq
    const DRCParameterRangeThreshold = { min: -15, max: 0 }; // drc.threshold
    const DRCParameterRangeRatio = { min: 1, max: 5 }; // parameter range //too high
    const DRCParameterRangeAttack = { min: 0.01, max: 0.5 }; // 
    const DRCParameterRangeRelease = { min: 0.05, max: 1 }; // 
    var inputSize = audioURL[audioDirIndex].length;

    for (var i = 0; i < inputSize; i++) {


      compressNodes[i].threshold.value = getRandom(DRCParameterRangeThreshold.min, DRCParameterRangeThreshold.max,3)
      compressNodes[i].ratio.value = getRandom(DRCParameterRangeRatio.min, DRCParameterRangeRatio.max,1)
      compressNodes[i].attack.value = getRandom(DRCParameterRangeAttack.min, DRCParameterRangeAttack.max,0.001)
      compressNodes[i].release.value = getRandom(DRCParameterRangeRelease.min, DRCParameterRangeRelease.max,0.01)

      // set pan param
      //console.log(panNodes[i])
      panNodes[i].positionX.value = getRandom(PanParameterRange.min, PanParameterRange.max,0.5)
      panNodes[i].positionY.value = getRandom(PanParameterRange.min, PanParameterRange.max,0.5)
      panNodes[i].positionZ.value = getRandom(PanParameterRange.min, PanParameterRange.max,0.5)

      // set gain param
      //console.log(peakFilters[i])

      for (var j = 0; j < 8; j++) {
        peakFilters[i][j].gain.value = getRandom(EqParameterRange.min, EqParameterRange.max,4)
      }
    }
  }


  function play(context, decodedData, gainNode, peaqNode, compressNodes, peakFilters, panNodes) {

    for (let key = 0; key < decodedData.length; key++) {
      const bufferedSource = context.createBufferSource();
      bufferedSource.buffer = decodedData[key];

      bufferedSource.connect(gainNode, 0, key);
      gainNode.connect(compressNodes[key], key, 0)

      for (var j = 0; j < peakFilters[key].length; j++) {
        (compressNodes[key]).connect(peakFilters[key][j])
        peakFilters[key][j].connect(panNodes[key]);
      }
      panNodes[key].connect(peaqNode, 0, key)
      peaqNode.connect(context.destination)

      bufferedSource.start();

    };

    context.oncomplete = function () {
      console.log('Audio playback ended.');
      summary(context, decodedData, compressNodes, panNodes, peakFilters, gainNode, peaqNode);
      // 2. set seed
      // 3. update slide
      setRandomSeed(compressNodes, panNodes, peakFilters);
      updateSlider(compressNodes, panNodes, peakFilters);

      if (iter < iterCnt) {
        initPeaq()

        training()

      } else {
        alert("Parameter opt finish!" + "bestfitness:" + bestFitness);
      }
    };


    context.startRendering();
  }

  function saveBestParam(compressNodes, panNodes, peakFilters) {
    let audioSize = audioURL[audioDirIndex].length;
    for (var i = 0; i < audioSize; i++) {

      bestXc.DRC[i] = [compressNodes[i].threshold.value, compressNodes[i].ratio.value, compressNodes[i].attack.value, compressNodes[i].release.value]
      bestXc.PAN[i] = [panNodes[i].positionX.value, panNodes[i].positionY.value, panNodes[i].positionZ.value]

      bestXc.GAIN[i] = []
      for (let j = 0; j < biquadFilterFreqency.length; j++) {
        bestXc.GAIN[i].push(peakFilters[i][j].gain.value)
      }
    }
  }

  // update slide
  function updateSlider(compressNodes, panNodes, peakFilters) {
    Threshold.value = compressNodes[0].threshold.value
    Ratio.value = compressNodes[0].ratio.value
    Attack.value = compressNodes[0].attack.value
    Release.value = compressNodes[0].release.value

    panX0.value = panNodes[0].positionX.value
    panY0.value = panNodes[0].positionY.value
    panZ0.value = panNodes[0].positionZ.value

    for (var i = 0; i < 8; i++) {
      gainsButton[i].value = peakFilters[0][i].gain.value
    }
  }

  function initPeaq() {
    var inputSize = audioURL[audioDirIndex].length;

    TotalM = new Array(inputSize).fill(0);
    peaqFrameIdx = new Array(inputSize).fill(0);
    bufferMn = new Array(inputSize);
    for (var i = 0; i < bufferMn.length; i++) {
      bufferMn[i] = new Array();
    }
  }

  function summary(context, decodedData, compressNodes, panNodes, peakFilters, gainNode, peaqNode) {
    iter++;
    // calculate adaptability
    const currentFitness = calcFitness();
    console.log("currentFitness:" + currentFitness);

    if (currentFitness != NaN && currentFitness < bestFitness && currentFitness > 10|| bestFitness < 0) {
      bestFitness = currentFitness
      console.log("bestfitness"+bestFitness)
      saveBestParam(compressNodes, panNodes, peakFilters)
    }
  };

  trainingBtn.addEventListener("click", async () => {

    training();
  })

}



