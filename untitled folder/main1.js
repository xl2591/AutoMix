
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
  const Knee = document.getElementById("Knee");
  const Attack = document.getElementById("Attack");
  const Release = document.getElementById("Release");
  const gain0 = document.getElementById("gain0");
  const gain1 = document.getElementById("gain1");
  const gain2 = document.getElementById("gain2");
  const gain3 = document.getElementById("gain3");
  const gain4 = document.getElementById("gain4");
  const gain5 = document.getElementById("gain5");
  const saveAudio1 = document.getElementById("audio");
  const saveAudio2 = document.getElementById("audio1");
  const saveAudio3 = document.getElementById("audio2");
  const totalAudio = document.getElementById("audio3");
  const trainingBtn = document.getElementById("training");
  const chartElement = document.getElementById('chart');
  const canvas0 = document.getElementById("canvas0");
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");

  // const
  let audioURL = []
  let audios = [];
  let audioDirIndex = 0;
  let pannerPosistions = [];

  let sampleRate = 44100;
  let recorders = [];
  let totalRecorder;
  var TotalM = [];
  let iterCnt = 30;
  let iterTime = 0;
  let bestFitness = -1;
  let bestXc = { "DRC": [], "PAN": [], "GAIN": [] };
  let bufferMn = new Array(3);
  let audioBuffer = new Array(3);
  bufferMn[0] = new Array;
  bufferMn[1] = new Array()
  bufferMn[2] = new Array()




  const panners = [panX0, panY0, panZ0]
  const biquadFilterFreqency = [75, 100, 250, 750, 2500, 7500];
  const qValues = [1, 0.6, 0.3, 0.3, 0.2, 1];
  const gainsButton = [gain0, gain1, gain2, gain3, gain4, gain5]
  const saveaudios = [saveAudio1, saveAudio2, saveAudio3];





  initAudio()

  // function initAudio() {
  //   audioURL.push(['/audio/2.wav'])
  // }

  function initAudio() {

    let audioDir = "/audio"
    for (let i = 1; i < 8; i += 2) {
      let subDir = audioDir + "/" + i.toString()

      let audioList = []
      for (let j = 1; j <= i; j++) {
        audioList.push(subDir + "/" + j.toString() + ".wav")
      }
      audioURL.push(audioList)
    }
    peaq = new Array(audioURL[0].length).fill(0);
    peaqCnt = new Array(audioURL[0].length).fill(0);
    pannerPosistions = new Array(audioURL[0].length).fill(undefined);
    TotalM = new Array(audioURL[0].length).fill(0);

    selectBtn.addEventListener("change", function () {
      audioDirIndex = parseInt(selectBtn.value)
      var inputSize = audioURL[audioDirIndex].length;
      TotalM = new Array(inputSize).fill(0);
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
        //  console.log(peakFilter)
      }
      // console.log(peakFilters)
    }

    // console.log(inputSize)
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
    Knee.oninput = () => compressNodes[0].knee.value = Knee.value
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

    // Set the button
    //SPA
    panX0.oninput = () => panNodes[0].positionX.value = panX0.value
    panY0.oninput = () => panNodes[0].positionY.value = panY0.value
    panZ0.oninput = () => panNodes[0].positionZ.value = panZ0.value

    //Gainnode 
    var inChannelCount = new Array(inputSize);
    var outChannelCount = new Array(inputSize);
    outChannelCount.fill(1);//声道个数

    const gainNode = new AudioWorkletNode(context, "levelBalance", {

      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize

    })

    //PEAQ node
    const peaqNode = new AudioWorkletNode(context, "PEAQ", {
      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize
    });
    // set bestXC


    for (var i = 0; i < inputSize; i++) {

      // set compress param
      // console.log(bestXc.DRC[i])

      compressNodes[i].threshold.value = bestXc.DRC[i][0]
      compressNodes[i].ratio.value = bestXc.DRC[i][1]
      compressNodes[i].attack.value = bestXc.DRC[i][2]
      compressNodes[i].release.value = bestXc.DRC[i][3]


      // set pan param

      panNodes[i].positionX.value = bestXc.PAN[i][0]
      panNodes[i].positionY.value = bestXc.PAN[i][1]
      panNodes[i].positionZ.value = bestXc.PAN[i][2]

      //PannerResult =  bestXc.PAN[i];
      // console.log( PannerResult);
      // set gain param
      // console.log(bestXc.GAIN[i])
      for (var j = 0; j < 6; j++) {
        peakFilters[i][j].gain.value = bestXc.GAIN[i][j]
      }
    }

    // visualization

    // 获取chart元素

    var pannnerresult = new Array();
    for (var i = 0; i < inputSize; i++) {
      pannnerresult.push(bestXc.PAN[i]);
    }


    console.log(pannnerresult);
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


    console.log(transformedArray);
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

    console.log(source);

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
      //   sampleRate = source.sampleRate

      //console.log(key)
      if (isplayOriginal) {
        source.connect(context.destination);
      } else {
        source.connect(gainNode, 0, key)
        gainNode.connect(peaqNode, key, key);
        peaqNode.connect(compressNodes[key], key, 0)


        for (var i = 0; i < peakFilters[key].length; i++) {
          (compressNodes[key]).connect(peakFilters[key][i])
          peakFilters[key][i].connect(panNodes[key]);
        }
        //compressNodes[key].connect(panNodes[key]);
        panNodes[key].connect(recordingNode[key]);
        // if (key >= 3) {
        recordingNode[key].connect(totalRecordingNode);

        totalRecordingNode.connect(context.destination);

        // source.connect(gainNode, 0, key)
        // gainNode.connect(compressNodes[key], key, 0);

        // for (var i = 0; i < peakFilters[key].length; i++) {
        //   (compressNodes[key]).connect(peakFilters[key][i])
        //   peakFilters[key][i].connect(panNodes[key]);
        // }
        // //compressNodes[key].connect(panNodes[key]);
        // panNodes[key].connect(peaqNode, 0, key);
        // peaqNode.connect(recordingNode[key], key, 0);

        // // if (key >= 3) {
        // recordingNode[key].connect(totalRecordingNode);
        // totalRecordingNode.connect(context.destination);
        // console.log("dddd")

      }
      //console.log("dddd")
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
    // mt
    TotalM.forEach(x => {
      mt += x * x;
    })
    // md
    var md = 0;
    TotalM.forEach(x => {
      TotalM.forEach(y => {
        md = Math.max(x - y, md)
      })
    })
    for (var i = 0; i < TotalM.length; i++) {
      for (var j = 0; j < TotalM.length; j++) {
        //md = Math.max(TotalM[i] - TotalM[j], md)
        var v = TotalM[i] - TotalM[j]
        md = Math.max(v, md)
      }
    }

    return mt + md;
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

  //console.log(playBtn)
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


    const context = new AudioContext();
    await context.audioWorklet.addModule("./PEAQ.js");
    await context.audioWorklet.addModule("./levelBalance.js");

    console.log("training run")
    var inputSize = audioURL[audioDirIndex].length;
    // console.log(inputSize)

    //PEAQ
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
        //  console.log(peakFilter)

      }
      // console.log(peakFilters)
    }

    // console.log(inputSize)
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

    //DRC
    Threshold.oninput = () => compressNodes[0].threshold.value = Threshold.value
    Ratio.oninput = () => compressNodes[0].ratio.value = Ratio.value
    Knee.oninput = () => compressNodes[0].knee.value = Knee.value
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

    // Set the button

    panX0.oninput = () => panNodes[0].positionX.value = panX0.value
    panY0.oninput = () => panNodes[0].positionY.value = panY0.value
    panZ0.oninput = () => panNodes[0].positionZ.value = panZ0.value

    // recording node
    let totalRecordingNode = context.createDynamicsCompressor();
    let recordingNode = new Array();
    for (var i = 0; i < inputSize; i++) {
      recordingNode.push(context.createDynamicsCompressor());
    }

    //Gainnode 
    var inChannelCount = new Array(inputSize);
    var outChannelCount = new Array(inputSize);
    inChannelCount.fill(1);//声道个数
    outChannelCount.fill(1);//声道个数

    const gainNode = new AudioWorkletNode(context, "levelBalance", {

      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize
    })

    //PEAQ node
    const peaqNode = new AudioWorkletNode(context, "PEAQ", {
      inputChannelCount: inChannelCount,
      outputChannelCount: outChannelCount,
      numberOfInputs: inputSize,
      numberOfOutputs: inputSize
    });


    // audioURL[audioDirIndex].forEach(async (url, key) => {
    //   const bufferedSource = context.createBufferSource();

    //   audios[key] = new Audio(url);
    //   const source = context.createMediaElementSource(audios[key]);
    //   // sampleRate = source.sampleRate

    //   source.connect(gainNode, 0, key)
    //   gainNode.connect(compressNodes[key], key, 0);

    //   for (var i = 0; i < peakFilters[key].length; i++) {
    //     (compressNodes[key]).connect(peakFilters[key][i])
    //     peakFilters[key][i].connect(panNodes[key]);

    //   }

    //   panNodes[key].connect(peaqNode, 0, key);
    //   peaqNode.connect(recordingNode[key], key, 0);

    //   recordingNode[key].connect(totalRecordingNode);

    //   audios[key].play();
    // })
    audioURL[audioDirIndex].forEach((url, key) => {
      
      const bufferedSource = context.createBufferSource();

  
      // Load and decode audio data
      let request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
      
          context.decodeAudioData(request.response, function(decodedData) {
            const offlineContext = new OfflineAudioContext(1, decodedData.length, 24000);
            
              let offlineSource = offlineContext.createBufferSource();
            //  offlineSource.buffer = decodedData;
             bufferedSource.buffer = decodedData;
             bufferedSource.connect(gainNode, 0, key);
             gainNode.connect(peaqNode, key, key);
             peaqNode.connect(compressNodes[key], key, 0)
             for (var i = 0; i < peakFilters[key].length; i++) {
                 compressNodes[key].connect(peakFilters[key][i]);
                 peakFilters[key][i].connect(panNodes[key]);
             }
             panNodes[key].connect(context.destination);
             bufferedSource.start();
             offlineContext.startRendering()
          });
         
         
      };
      request.send();
  });
  
  context.oncomplete = function(event) {
    console.log("ccccc");
      xcOpt(compressNodes, panNodes, peakFilters);
  };

    // audios[0].addEventListener('ended', function () {
    //   console.log("ccccc")
    //   xcOpt(context, compressNodes, panNodes, peakFilters);
    //   //console.log(xcOpt().compresss);
    // })

    recorders = []
    for (let i = 0; i < inputSize; i++) {
      recorders.push(new Recorder(recordingNode[i]))
      recorders[i].record()
    }
    totalRecorder = new Recorder(totalRecordingNode)
    totalRecorder.record()

    peaqNode.port.onmessage = (event) => {
      var audioData = event.data;
      var peaqValue = audioData.Mn;
      var peaqIndex = audioData.key;
      bufferMn[peaqIndex].push(peaqValue);
      TotalM[peaqIndex] += peaqValue;

      // console.log(bufferMn)


    };
  }


  function getRandom(minV, maxV) {
    return Math.random() * (maxV - minV) + minV
  }
  function xcOpt(compressNodes, panNodes, peakFilters) {
    iterTime++;
    // calculate adaptability
    const currentFitness = calcFitness();
    let audioIndex = audioURL[audioDirIndex].length;

    const PanParameterRange = { min: -3, max: 3 }; // panner
    const EqParameterRange = { min: -30, max: 30 }; // eq
    const DRCParameterRangeThreshold = { min: -30, max: 0 }; // drc.threshold
    const DRCParameterRangeRatio = { min: 1, max: 6 }; // 参数范围
    const DRCParameterRangeAttack = { min: 0.005, max: 0.25 }; // 参数范围
    const DRCParameterRangeRelease = { min: 0.005, max: 1 }; // 参数范围


    // console.log ("liuniuniu1");
    if (currentFitness < bestFitness || bestFitness < 0) {
      bestFitness = currentFitness
      console.log(bestFitness);

      for (var i = 0; i < audioIndex; i++) {
        console.log(bestXc)

        console.log(compressNodes)
        bestXc.DRC[i] = [compressNodes[i].threshold.value, compressNodes[i].ratio.value, compressNodes[i].attack.value, compressNodes[i].release.value]
        bestXc.PAN[i] = [panNodes[i].positionX.value, panNodes[i].positionY.value, panNodes[i].positionZ.value]
        bestXc.GAIN[i] = [peakFilters[i][0].gain.value, peakFilters[i][1].gain.value, peakFilters[i][2].gain.value, peakFilters[i][3].gain.value, peakFilters[i][4].gain.value, peakFilters[i][5].gain.value]
      }
    }


    if (iterTime < iterCnt) {


      for (var i = 0; i < audioIndex; i++) {

        // set compress param

        //console.log(compressNodes[i])
        //console.log(compressNodes)
        compressNodes[i].threshold.value = getRandom(DRCParameterRangeThreshold.min, DRCParameterRangeThreshold.max)
        compressNodes[i].ratio.value = getRandom(DRCParameterRangeRatio.min, DRCParameterRangeRatio.max)
        compressNodes[i].attack.value = getRandom(DRCParameterRangeAttack.min, DRCParameterRangeAttack.max)
        compressNodes[i].release.value = getRandom(DRCParameterRangeRelease.min, DRCParameterRangeRelease.max)

        // set pan param
        //console.log(panNodes[i])
        panNodes[i].positionX.value = getRandom(PanParameterRange.min, PanParameterRange.max)
        panNodes[i].positionY.value = getRandom(PanParameterRange.min, PanParameterRange.max)
        panNodes[i].positionZ.value = getRandom(PanParameterRange.min, PanParameterRange.max)

        // set gain param
        //console.log(peakFilters[i])
        for (var j = 0; j < 6; j++) {
          peakFilters[i][j].gain.value = getRandom(EqParameterRange.min, EqParameterRange.max)
        }

      }

      // show in slide
      Threshold.value = compressNodes[0].threshold.value
      Ratio.value = compressNodes[0].ratio.value
      Attack.value = compressNodes[0].attack.value
      Release.value = compressNodes[0].release.value

      panX0.value = panNodes[0].positionX.value
      panY0.value = panNodes[0].positionY.value
      panZ0.value = panNodes[0].positionZ.value

      for (var i = 0; i < 6; i++) {
        gainsButton[i].value = peakFilters[0][i].gain.value
      }
      //masking

      // TotalM = new Array(audioURL[audioDirIndex].length).fill(0);
      // training();
    } else {

      for (var i = 0; i < audioIndex; i++) {

        // set compress param
        // console.log(bestXc.DRC[i])

        compressNodes[i].threshold.value = bestXc.DRC[i][0]
        compressNodes[i].ratio.value = bestXc.DRC[i][1]
        compressNodes[i].attack.value = bestXc.DRC[i][2]
        compressNodes[i].release.value = bestXc.DRC[i][3]


        // set pan param
        //console.log(bestXc.PAN[i])
        panNodes[i].positionX.value = bestXc.PAN[i][0]
        panNodes[i].positionY.value = bestXc.PAN[i][1]
        panNodes[i].positionZ.value = bestXc.PAN[i][2]

        // set gain param
        // console.log(bestXc.GAIN[i])
        for (var j = 0; j < 6; j++) {
          peakFilters[i][j].gain.value = bestXc.GAIN[i][j]
        }
      }

      alert("Parameter opt finish!");

    }
  };

  trainingBtn.addEventListener("click", async () => {
    // audioURL[audioDirIndex].forEach(async (url, key) => {

    // })
    const context = new AudioContext();
    // const offlineContext = new OfflineAudioContext(1, 44100, 44100);
    // await context.resume();
    await context.audioWorklet.addModule("./PEAQ.js");
    await context.audioWorklet.addModule("./levelBalance.js");

    training();

  })



}
