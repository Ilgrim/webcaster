// Generated by CoffeeScript 1.11.1
(function() {
  var Webcaster, base, base1,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  navigator.mediaDevices || (navigator.mediaDevices = {});

  (base = navigator.mediaDevices).getUserMedia || (base.getUserMedia = function(constraints) {
    var fn;
    fn = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (fn == null) {
      return Promise.reject(new Error("getUserMedia is not implemented in this browser"));
    }
    return new Promise(function(resolve, reject) {
      return fn.call(navigator, constraints, resolve, reject);
    });
  });

  (base1 = navigator.mediaDevices).enumerateDevices || (base1.enumerateDevices = function() {
    return Promise.reject(new Error("enumerateDevices is not implemented on this browser"));
  });

  window.Webcaster = Webcaster = {
    View: {},
    Model: {},
    Source: {},
    prettifyTime: function(time) {
      var hours, minutes, result, seconds;
      hours = parseInt(time / 3600);
      time %= 3600;
      minutes = parseInt(time / 60);
      seconds = parseInt(time % 60);
      if (minutes < 10) {
        minutes = "0" + minutes;
      }
      if (seconds < 10) {
        seconds = "0" + seconds;
      }
      result = minutes + ":" + seconds;
      if (hours > 0) {
        result = hours + ":" + result;
      }
      return result;
    }
  };

  Webcaster.Node = (function() {
    _.extend(Node.prototype, Backbone.Events);

    function Node(arg) {
      this.model = arg.model;
      if (typeof webkitAudioContext !== "undefined") {
        this.context = new webkitAudioContext;
      } else {
        this.context = new AudioContext;
      }
      this.webcast = this.context.createWebcastSource(4096, 2);
      this.webcast.connect(this.context.destination);
      this.model.on("change:passThrough", (function(_this) {
        return function() {
          return _this.webcast.setPassThrough(_this.model.get("passThrough"));
        };
      })(this));
    }

    Node.prototype.startStream = function() {
      var encoder;
      switch (this.model.get("encoder")) {
        case "mp3":
          encoder = Webcast.Encoder.Mp3;
          break;
        case "raw":
          encoder = Webcast.Encoder.Raw;
      }
      this.encoder = new encoder({
        channels: this.model.get("channels"),
        samplerate: this.model.get("samplerate"),
        bitrate: this.model.get("bitrate")
      });
      if (this.model.get("samplerate") !== this.context.sampleRate) {
        this.encoder = new Webcast.Encoder.Resample({
          encoder: this.encoder,
          type: Samplerate.LINEAR,
          samplerate: this.context.sampleRate
        });
      }
      if (this.model.get("asynchronous")) {
        this.encoder = new Webcast.Encoder.Asynchronous({
          encoder: this.encoder,
          scripts: ["https://rawgithub.com/webcast/libsamplerate.js/master/dist/libsamplerate.js", "https://rawgithub.com/savonet/shine/master/js/dist/libshine.js", "https://rawgithub.com/webcast/webcast.js/master/lib/webcast.js"]
        });
      }
      return this.webcast.connectSocket(this.encoder, this.model.get("uri"));
    };

    Node.prototype.stopStream = function() {
      return this.webcast.close();
    };

    Node.prototype.createAudioSource = function(arg, model, cb) {
      var audio, el, file;
      file = arg.file, audio = arg.audio;
      el = new Audio(URL.createObjectURL(file));
      el.controls = false;
      el.autoplay = false;
      el.loop = false;
      el.addEventListener("ended", (function(_this) {
        return function() {
          return model.onEnd();
        };
      })(this));
      return el.addEventListener("canplay", (function(_this) {
        return function() {
          var source;
          source = _this.context.createMediaElementSource(el);
          source.play = function() {
            return el.play();
          };
          source.position = function() {
            return el.currentTime;
          };
          source.duration = function() {
            return el.duration;
          };
          source.paused = function() {
            return el.paused;
          };
          source.stop = function() {
            el.pause();
            return el.remove();
          };
          source.pause = function() {
            return el.pause();
          };
          source.seek = function(percent) {
            var time;
            time = percent * parseFloat(audio.length);
            el.currentTime = time;
            return time;
          };
          return cb(source);
        };
      })(this));
    };

    Node.prototype.createMadSource = function(arg, model, cb) {
      var file;
      file = arg.file;
      return file.createMadDecoder((function(_this) {
        return function(decoder, format) {
          var fn, source;
          source = _this.context.createMadSource(1024, decoder, format);
          source.play = function() {
            return source.start(0);
          };
          fn = source.stop;
          source.stop = function() {
            return fn.call(source, 0);
          };
          return cb(source);
        };
      })(this));
    };

    Node.prototype.createFileSource = function(file, model, cb) {
      var ref;
      if ((ref = this.source) != null) {
        ref.disconnect();
      }
      if (/\.mp3$/i.test(file.file.name) && model.get("mad")) {
        return this.createMadSource(file, model, cb);
      } else {
        return this.createAudioSource(file, model, cb);
      }
    };

    Node.prototype.createMicrophoneSource = function(constraints, cb) {
      return navigator.mediaDevices.getUserMedia(constraints).then((function(_this) {
        return function(stream) {
          var source;
          source = _this.context.createMediaStreamSource(stream);
          source.stop = function() {
            var ref;
            return (ref = stream.getAudioTracks()) != null ? ref[0].stop() : void 0;
          };
          return cb(source);
        };
      })(this));
    };

    Node.prototype.sendMetadata = function(data) {
      return this.webcast.sendMetadata(data);
    };

    Node.prototype.close = function(cb) {
      return this.webcast.close(cb);
    };

    return Node;

  })();

  Webcaster.Model.Track = (function(superClass) {
    extend(Track, superClass);

    function Track() {
      this.setTrackGain = bind(this.setTrackGain, this);
      return Track.__super__.constructor.apply(this, arguments);
    }

    Track.prototype.initialize = function(attributes, options) {
      this.node = options.node;
      this.mixer = options.mixer;
      this.mixer.on("cue", (function(_this) {
        return function() {
          return _this.set({
            passThrough: false
          });
        };
      })(this));
      this.on("change:trackGain", this.setTrackGain);
      this.on("ended", this.stop);
      return this.sink = this.node.webcast;
    };

    Track.prototype.togglePassThrough = function() {
      var passThrough;
      passThrough = this.get("passThrough");
      if (passThrough) {
        return this.set({
          passThrough: false
        });
      } else {
        this.mixer.trigger("cue");
        return this.set({
          passThrough: true
        });
      }
    };

    Track.prototype.isPlaying = function() {
      return this.source != null;
    };

    Track.prototype.createControlsNode = function() {
      var bufferLength, bufferLog, bufferSize, log10, source;
      bufferSize = 4096;
      bufferLength = parseFloat(bufferSize) / parseFloat(this.node.context.sampleRate);
      bufferLog = Math.log(parseFloat(bufferSize));
      log10 = 2.0 * Math.log(10);
      source = this.node.context.createScriptProcessor(bufferSize, 2, 2);
      source.onaudioprocess = (function(_this) {
        return function(buf) {
          var channel, channelData, i, j, k, ref, ref1, ref2, results, ret, rms, volume;
          ret = {};
          if (((ref = _this.source) != null ? ref.position : void 0) != null) {
            ret["position"] = _this.source.position();
          } else {
            if (_this.source != null) {
              ret["position"] = parseFloat(_this.get("position")) + bufferLength;
            }
          }
          results = [];
          for (channel = j = 0, ref1 = buf.inputBuffer.numberOfChannels - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; channel = 0 <= ref1 ? ++j : --j) {
            channelData = buf.inputBuffer.getChannelData(channel);
            rms = 0.0;
            for (i = k = 0, ref2 = channelData.length - 1; 0 <= ref2 ? k <= ref2 : k >= ref2; i = 0 <= ref2 ? ++k : --k) {
              rms += Math.pow(channelData[i], 2);
            }
            volume = 100 * Math.exp((Math.log(rms) - bufferLog) / log10);
            if (channel === 0) {
              ret["volumeLeft"] = volume;
            } else {
              ret["volumeRight"] = volume;
            }
            _this.set(ret);
            results.push(buf.outputBuffer.getChannelData(channel).set(channelData));
          }
          return results;
        };
      })(this);
      return source;
    };

    Track.prototype.createPassThrough = function() {
      var source;
      source = this.node.context.createScriptProcessor(8192, 2, 2);
      source.onaudioprocess = (function(_this) {
        return function(buf) {
          var channel, channelData, j, ref, results;
          channelData = buf.inputBuffer.getChannelData(channel);
          results = [];
          for (channel = j = 0, ref = buf.inputBuffer.numberOfChannels - 1; 0 <= ref ? j <= ref : j >= ref; channel = 0 <= ref ? ++j : --j) {
            if (_this.get("passThrough")) {
              results.push(buf.outputBuffer.getChannelData(channel).set(channelData));
            } else {
              results.push(buf.outputBuffer.getChannelData(channel).set(new Float32Array(channelData.length)));
            }
          }
          return results;
        };
      })(this);
      return source;
    };

    Track.prototype.setTrackGain = function() {
      if (this.trackGain == null) {
        return;
      }
      return this.trackGain.gain.value = parseFloat(this.get("trackGain")) / 100.0;
    };

    Track.prototype.prepare = function() {
      this.controlsNode = this.createControlsNode();
      this.controlsNode.connect(this.sink);
      this.trackGain = this.node.context.createGain();
      this.trackGain.connect(this.controlsNode);
      this.setTrackGain();
      this.destination = this.trackGain;
      this.passThrough = this.createPassThrough();
      this.passThrough.connect(this.node.context.destination);
      return this.destination.connect(this.passThrough);
    };

    Track.prototype.togglePause = function() {
      var ref, ref1;
      if (((ref = this.source) != null ? ref.pause : void 0) == null) {
        return;
      }
      if ((ref1 = this.source) != null ? typeof ref1.paused === "function" ? ref1.paused() : void 0 : void 0) {
        this.source.play();
        return this.trigger("playing");
      } else {
        this.source.pause();
        return this.trigger("paused");
      }
    };

    Track.prototype.stop = function() {
      var ref, ref1, ref2, ref3, ref4;
      if ((ref = this.source) != null) {
        if (typeof ref.stop === "function") {
          ref.stop();
        }
      }
      if ((ref1 = this.source) != null) {
        ref1.disconnect();
      }
      if ((ref2 = this.trackGain) != null) {
        ref2.disconnect();
      }
      if ((ref3 = this.controlsNode) != null) {
        ref3.disconnect();
      }
      if ((ref4 = this.passThrough) != null) {
        ref4.disconnect();
      }
      this.source = this.trackGain = this.controlsNode = this.passThrough = null;
      this.set({
        position: 0.0
      });
      return this.trigger("stopped");
    };

    Track.prototype.seek = function(percent) {
      var position, ref;
      if (!(position = (ref = this.source) != null ? typeof ref.seek === "function" ? ref.seek(percent) : void 0 : void 0)) {
        return;
      }
      return this.set({
        position: position
      });
    };

    Track.prototype.sendMetadata = function(file) {
      return this.node.sendMetadata(file.metadata);
    };

    return Track;

  })(Backbone.Model);

  Webcaster.Model.Microphone = (function(superClass) {
    extend(Microphone, superClass);

    function Microphone() {
      return Microphone.__super__.constructor.apply(this, arguments);
    }

    Microphone.prototype.initialize = function() {
      Microphone.__super__.initialize.apply(this, arguments);
      return this.on("change:device", function() {
        if (this.source == null) {
          return;
        }
        return this.createSource();
      });
    };

    Microphone.prototype.createSource = function(cb) {
      var constraints;
      if (this.source != null) {
        this.source.disconnect(this.destination);
      }
      constraints = {
        video: false
      };
      if (this.get("device")) {
        constraints.audio = {
          exact: this.get("device")
        };
      } else {
        constraints.audio = true;
      }
      return this.node.createMicrophoneSource(constraints, (function(_this) {
        return function(source1) {
          _this.source = source1;
          _this.source.connect(_this.destination);
          return typeof cb === "function" ? cb() : void 0;
        };
      })(this));
    };

    Microphone.prototype.play = function() {
      this.prepare();
      return this.createSource((function(_this) {
        return function() {
          return _this.trigger("playing");
        };
      })(this));
    };

    return Microphone;

  })(Webcaster.Model.Track);

  Webcaster.Model.Mixer = (function(superClass) {
    extend(Mixer, superClass);

    function Mixer() {
      return Mixer.__super__.constructor.apply(this, arguments);
    }

    Mixer.prototype.getLeftVolume = function() {
      return 1.0 - this.getRightVolume();
    };

    Mixer.prototype.getRightVolume = function() {
      return parseFloat(this.get("slider")) / 100.00;
    };

    return Mixer;

  })(Backbone.Model);

  Webcaster.Model.Playlist = (function(superClass) {
    extend(Playlist, superClass);

    function Playlist() {
      this.setMixGain = bind(this.setMixGain, this);
      return Playlist.__super__.constructor.apply(this, arguments);
    }

    Playlist.prototype.initialize = function() {
      Playlist.__super__.initialize.apply(this, arguments);
      this.mixer.on("change:slider", this.setMixGain);
      this.mixGain = this.node.context.createGain();
      this.mixGain.connect(this.node.webcast);
      return this.sink = this.mixGain;
    };

    Playlist.prototype.setMixGain = function() {
      if (this.mixGain == null) {
        return;
      }
      if (this.get("side") === "left") {
        return this.mixGain.gain.value = this.mixer.getLeftVolume();
      } else {
        return this.mixGain.gain.value = this.mixer.getRightVolume();
      }
    };

    Playlist.prototype.appendFiles = function(newFiles, cb) {
      var addFile, files, i, j, onDone, ref, results;
      files = this.get("files");
      onDone = _.after(newFiles.length, (function(_this) {
        return function() {
          _this.set({
            files: files
          });
          return typeof cb === "function" ? cb() : void 0;
        };
      })(this));
      addFile = function(file) {
        return file.readTaglibMetadata((function(_this) {
          return function(data) {
            files.push({
              file: file,
              audio: data.audio,
              metadata: data.metadata
            });
            return onDone();
          };
        })(this));
      };
      results = [];
      for (i = j = 0, ref = newFiles.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        results.push(addFile(newFiles[i]));
      }
      return results;
    };

    Playlist.prototype.selectFile = function(options) {
      var file, files, index;
      if (options == null) {
        options = {};
      }
      files = this.get("files");
      index = this.get("fileIndex");
      if (files.length === 0) {
        return;
      }
      index += options.backward ? -1 : 1;
      if (index < 0) {
        index = files.length - 1;
      }
      if (index >= files.length) {
        if (!this.get("loop")) {
          this.set({
            fileIndex: -1
          });
          return;
        }
        if (index < 0) {
          index = files.length - 1;
        } else {
          index = 0;
        }
      }
      file = files[index];
      this.set({
        fileIndex: index
      });
      return file;
    };

    Playlist.prototype.play = function(file) {
      this.prepare();
      this.setMixGain();
      return this.node.createFileSource(file, this, (function(_this) {
        return function(source1) {
          var ref;
          _this.source = source1;
          _this.source.connect(_this.destination);
          if (_this.source.duration != null) {
            _this.set({
              duration: _this.source.duration()
            });
          } else {
            if (((ref = file.audio) != null ? ref.length : void 0) != null) {
              _this.set({
                duration: parseFloat(file.audio.length)
              });
            }
          }
          _this.source.play(file);
          return _this.trigger("playing");
        };
      })(this));
    };

    Playlist.prototype.onEnd = function() {
      this.stop();
      if (this.get("playThrough")) {
        return this.play(this.selectFile());
      }
    };

    return Playlist;

  })(Webcaster.Model.Track);

  Webcaster.Model.Settings = (function(superClass) {
    extend(Settings, superClass);

    function Settings() {
      return Settings.__super__.constructor.apply(this, arguments);
    }

    Settings.prototype.initialize = function(attributes, options) {
      this.mixer = options.mixer;
      return this.mixer.on("cue", (function(_this) {
        return function() {
          return _this.set({
            passThrough: false
          });
        };
      })(this));
    };

    Settings.prototype.togglePassThrough = function() {
      var passThrough;
      passThrough = this.get("passThrough");
      if (passThrough) {
        return this.set({
          passThrough: false
        });
      } else {
        this.mixer.trigger("cue");
        return this.set({
          passThrough: true
        });
      }
    };

    return Settings;

  })(Backbone.Model);

  Webcaster.View.Track = (function(superClass) {
    extend(Track, superClass);

    function Track() {
      return Track.__super__.constructor.apply(this, arguments);
    }

    Track.prototype.initialize = function() {
      this.model.on("change:passThrough", (function(_this) {
        return function() {
          if (_this.model.get("passThrough")) {
            return _this.$(".passThrough").addClass("btn-cued").removeClass("btn-info");
          } else {
            return _this.$(".passThrough").addClass("btn-info").removeClass("btn-cued");
          }
        };
      })(this));
      this.model.on("change:volumeLeft", (function(_this) {
        return function() {
          return _this.$(".volume-left").width((_this.model.get("volumeLeft")) + "%");
        };
      })(this));
      return this.model.on("change:volumeRight", (function(_this) {
        return function() {
          return _this.$(".volume-right").width((_this.model.get("volumeRight")) + "%");
        };
      })(this));
    };

    Track.prototype.onPassThrough = function(e) {
      e.preventDefault();
      return this.model.togglePassThrough();
    };

    Track.prototype.onSubmit = function(e) {
      return e.preventDefault();
    };

    return Track;

  })(Backbone.View);

  Webcaster.View.Microphone = (function(superClass) {
    extend(Microphone, superClass);

    function Microphone() {
      return Microphone.__super__.constructor.apply(this, arguments);
    }

    Microphone.prototype.events = {
      "click .record-audio": "onRecord",
      "click .passThrough": "onPassThrough",
      "submit": "onSubmit"
    };

    Microphone.prototype.initialize = function() {
      Microphone.__super__.initialize.apply(this, arguments);
      this.model.on("playing", (function(_this) {
        return function() {
          _this.$(".play-control").removeAttr("disabled");
          _this.$(".record-audio").addClass("btn-recording");
          _this.$(".volume-left").width("0%");
          return _this.$(".volume-right").width("0%");
        };
      })(this));
      return this.model.on("stopped", (function(_this) {
        return function() {
          _this.$(".record-audio").removeClass("btn-recording");
          _this.$(".volume-left").width("0%");
          return _this.$(".volume-right").width("0%");
        };
      })(this));
    };

    Microphone.prototype.render = function() {
      this.$(".microphone-slider").slider({
        orientation: "vertical",
        min: 0,
        max: 150,
        value: 100,
        stop: (function(_this) {
          return function() {
            return _this.$("a.ui-slider-handle").tooltip("hide");
          };
        })(this),
        slide: (function(_this) {
          return function(e, ui) {
            _this.model.set({
              trackGain: ui.value
            });
            return _this.$("a.ui-slider-handle").tooltip("show");
          };
        })(this)
      });
      this.$("a.ui-slider-handle").tooltip({
        title: (function(_this) {
          return function() {
            return _this.model.get("trackGain");
          };
        })(this),
        trigger: "",
        animation: false,
        placement: "left"
      });
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      }).then((function(_this) {
        return function() {
          return navigator.mediaDevices.enumerateDevices().then(function(devices) {
            var $select;
            devices = _.filter(devices, function(arg) {
              var deviceId, kind;
              kind = arg.kind, deviceId = arg.deviceId;
              return kind === "audioinput" && deviceId !== "default";
            });
            if (_.isEmpty(devices)) {
              return;
            }
            $select = _this.$(".microphone-entry select");
            _.each(devices, function(arg) {
              var deviceId, label;
              label = arg.label, deviceId = arg.deviceId;
              return $select.append("<option value='" + deviceId + "'>" + label + "</option>");
            });
            $select.find("option:eq(0)").prop("selected", true);
            _this.model.set("device", $select.val());
            $select.select(function() {
              return this.model.set("device", $select.val());
            });
            return _this.$(".microphone-entry").show();
          });
        };
      })(this));
      return this;
    };

    Microphone.prototype.onRecord = function(e) {
      e.preventDefault();
      if (this.model.isPlaying()) {
        return this.model.stop();
      }
      this.$(".play-control").attr({
        disabled: "disabled"
      });
      return this.model.play();
    };

    return Microphone;

  })(Webcaster.View.Track);

  Webcaster.View.Mixer = (function(superClass) {
    extend(Mixer, superClass);

    function Mixer() {
      return Mixer.__super__.constructor.apply(this, arguments);
    }

    Mixer.prototype.render = function() {
      this.$(".slider").slider({
        stop: (function(_this) {
          return function() {
            return _this.$("a.ui-slider-handle").tooltip("hide");
          };
        })(this),
        slide: (function(_this) {
          return function(e, ui) {
            _this.model.set({
              slider: ui.value
            });
            return _this.$("a.ui-slider-handle").tooltip("show");
          };
        })(this)
      });
      this.$("a.ui-slider-handle").tooltip({
        title: (function(_this) {
          return function() {
            return _this.model.get("slider");
          };
        })(this),
        trigger: "",
        animation: false,
        placement: "bottom"
      });
      return this;
    };

    return Mixer;

  })(Backbone.View);

  Webcaster.View.Playlist = (function(superClass) {
    extend(Playlist, superClass);

    function Playlist() {
      return Playlist.__super__.constructor.apply(this, arguments);
    }

    Playlist.prototype.events = {
      "click .play-audio": "onPlay",
      "click .pause-audio": "onPause",
      "click .previous": "onPrevious",
      "click .next": "onNext",
      "click .stop": "onStop",
      "click .progress-seek": "onSeek",
      "click .passThrough": "onPassThrough",
      "change .files": "onFiles",
      "change .playThrough": "onPlayThrough",
      "change .loop": "onLoop",
      "submit": "onSubmit"
    };

    Playlist.prototype.initialize = function() {
      Playlist.__super__.initialize.apply(this, arguments);
      this.model.on("change:fileIndex", (function(_this) {
        return function() {
          _this.$(".track-row").removeClass("success");
          return _this.$(".track-row-" + (_this.model.get("fileIndex"))).addClass("success");
        };
      })(this));
      this.model.on("playing", (function(_this) {
        return function() {
          _this.$(".play-control").removeAttr("disabled");
          _this.$(".play-audio").hide();
          _this.$(".pause-audio").show();
          _this.$(".track-position-text").removeClass("blink").text("");
          _this.$(".volume-left").width("0%");
          _this.$(".volume-right").width("0%");
          if (_this.model.get("duration")) {
            return _this.$(".progress-volume").css("cursor", "pointer");
          } else {
            _this.$(".track-position").addClass("progress-striped active");
            return _this.setTrackProgress(100);
          }
        };
      })(this));
      this.model.on("paused", (function(_this) {
        return function() {
          _this.$(".play-audio").show();
          _this.$(".pause-audio").hide();
          _this.$(".volume-left").width("0%");
          _this.$(".volume-right").width("0%");
          return _this.$(".track-position-text").addClass("blink");
        };
      })(this));
      this.model.on("stopped", (function(_this) {
        return function() {
          _this.$(".play-audio").show();
          _this.$(".pause-audio").hide();
          _this.$(".progress-volume").css("cursor", "");
          _this.$(".track-position").removeClass("progress-striped active");
          _this.setTrackProgress(0);
          _this.$(".track-position-text").removeClass("blink").text("");
          _this.$(".volume-left").width("0%");
          return _this.$(".volume-right").width("0%");
        };
      })(this));
      this.model.on("change:position", (function(_this) {
        return function() {
          var duration, position;
          if (!(duration = _this.model.get("duration"))) {
            return;
          }
          position = parseFloat(_this.model.get("position"));
          _this.setTrackProgress(100.0 * position / parseFloat(duration));
          return _this.$(".track-position-text").text((Webcaster.prettifyTime(position)) + " / " + (Webcaster.prettifyTime(duration)));
        };
      })(this));
      if ((new Audio).canPlayType("audio/mpeg") === "") {
        return this.model.set({
          mad: true
        });
      }
    };

    Playlist.prototype.render = function() {
      var files;
      this.$(".volume-slider").slider({
        orientation: "vertical",
        min: 0,
        max: 150,
        value: 100,
        stop: (function(_this) {
          return function() {
            return _this.$("a.ui-slider-handle").tooltip("hide");
          };
        })(this),
        slide: (function(_this) {
          return function(e, ui) {
            _this.model.set({
              trackGain: ui.value
            });
            return _this.$("a.ui-slider-handle").tooltip("show");
          };
        })(this)
      });
      this.$("a.ui-slider-handle").tooltip({
        title: (function(_this) {
          return function() {
            return _this.model.get("trackGain");
          };
        })(this),
        trigger: "",
        animation: false,
        placement: "left"
      });
      files = this.model.get("files");
      this.$(".files-table").empty();
      if (!(files.length > 0)) {
        return this;
      }
      _.each(files, (function(_this) {
        return function(arg, index) {
          var audio, file, klass, metadata, time;
          file = arg.file, audio = arg.audio, metadata = arg.metadata;
          if ((audio != null ? audio.length : void 0) !== 0) {
            time = Webcaster.prettifyTime(audio.length);
          } else {
            time = "N/A";
          }
          if (_this.model.get("fileIndex") === index) {
            klass = "success";
          } else {
            klass = "";
          }
          return _this.$(".files-table").append("<tr class='track-row track-row-" + index + " " + klass + "'>\n  <td>" + (index + 1) + "</td>\n  <td>" + metadata.title + "</td>\n  <td>" + metadata.artist + "</td>\n  <td>" + time + "</td>\n</tr>");
        };
      })(this));
      this.$(".playlist-table").show();
      return this;
    };

    Playlist.prototype.setTrackProgress = function(percent) {
      return this.$(".track-position").width((percent * $(".progress-volume").width() / 100) + "px");
    };

    Playlist.prototype.play = function(options) {
      this.model.stop();
      if (!(this.file = this.model.selectFile(options))) {
        return;
      }
      this.$(".play-control").attr({
        disabled: "disabled"
      });
      return this.model.play(this.file);
    };

    Playlist.prototype.onPlay = function(e) {
      e.preventDefault();
      if (this.model.isPlaying()) {
        this.model.togglePause();
        return;
      }
      return this.play();
    };

    Playlist.prototype.onPause = function(e) {
      e.preventDefault();
      return this.model.togglePause();
    };

    Playlist.prototype.onPrevious = function(e) {
      e.preventDefault();
      if (this.model.isPlaying() == null) {
        return;
      }
      return this.play({
        backward: true
      });
    };

    Playlist.prototype.onNext = function(e) {
      e.preventDefault();
      if (!this.model.isPlaying()) {
        return;
      }
      return this.play();
    };

    Playlist.prototype.onStop = function(e) {
      e.preventDefault();
      this.$(".track-row").removeClass("success");
      this.model.stop();
      return this.file = null;
    };

    Playlist.prototype.onSeek = function(e) {
      e.preventDefault();
      return this.model.seek((e.pageX - $(e.target).offset().left) / $(e.target).width());
    };

    Playlist.prototype.onFiles = function() {
      var files;
      files = this.$(".files")[0].files;
      this.$(".files").attr({
        disabled: "disabled"
      });
      return this.model.appendFiles(files, (function(_this) {
        return function() {
          _this.$(".files").removeAttr("disabled").val("");
          return _this.render();
        };
      })(this));
    };

    Playlist.prototype.onPlayThrough = function(e) {
      return this.model.set({
        playThrough: $(e.target).is(":checked")
      });
    };

    Playlist.prototype.onLoop = function(e) {
      return this.model.set({
        loop: $(e.target).is(":checked")
      });
    };

    return Playlist;

  })(Webcaster.View.Track);

  Webcaster.View.Settings = (function(superClass) {
    extend(Settings, superClass);

    function Settings() {
      return Settings.__super__.constructor.apply(this, arguments);
    }

    Settings.prototype.events = {
      "change .uri": "onUri",
      "change input.encoder": "onEncoder",
      "change input.channels": "onChannels",
      "change .samplerate": "onSamplerate",
      "change .bitrate": "onBitrate",
      "change .mono": "onMono",
      "change .asynchronous": "onAsynchronous",
      "click .passThrough": "onPassThrough",
      "click .start-stream": "onStart",
      "click .stop-stream": "onStop",
      "submit": "onSubmit"
    };

    Settings.prototype.initialize = function(arg) {
      this.node = arg.node;
      return this.model.on("change:passThrough", (function(_this) {
        return function() {
          if (_this.model.get("passThrough")) {
            return _this.$(".passThrough").addClass("btn-cued").removeClass("btn-info");
          } else {
            return _this.$(".passThrough").addClass("btn-info").removeClass("btn-cued");
          }
        };
      })(this));
    };

    Settings.prototype.render = function() {
      var bitrate, samplerate;
      samplerate = this.model.get("samplerate");
      this.$(".samplerate").empty();
      _.each(this.model.get("samplerates"), (function(_this) {
        return function(rate) {
          var selected;
          selected = samplerate === rate ? "selected" : "";
          return $("<option value='" + rate + "' " + selected + ">" + rate + "</option>").appendTo(_this.$(".samplerate"));
        };
      })(this));
      bitrate = this.model.get("bitrate");
      this.$(".bitrate").empty();
      _.each(this.model.get("bitrates"), (function(_this) {
        return function(rate) {
          var selected;
          selected = bitrate === rate ? "selected" : "";
          return $("<option value='" + rate + "' " + selected + ">" + rate + "</option>").appendTo(_this.$(".bitrate"));
        };
      })(this));
      return this;
    };

    Settings.prototype.onUri = function() {
      return this.model.set({
        uri: this.$(".uri").val()
      });
    };

    Settings.prototype.onEncoder = function(e) {
      return this.model.set({
        encoder: $(e.target).val()
      });
    };

    Settings.prototype.onChannels = function(e) {
      return this.model.set({
        channels: parseInt($(e.target).val())
      });
    };

    Settings.prototype.onSamplerate = function(e) {
      return this.model.set({
        samplerate: parseInt($(e.target).val())
      });
    };

    Settings.prototype.onBitrate = function(e) {
      return this.model.set({
        bitrate: parseInt($(e.target).val())
      });
    };

    Settings.prototype.onAsynchronous = function(e) {
      return this.model.set({
        asynchronous: $(e.target).is(":checked")
      });
    };

    Settings.prototype.onPassThrough = function(e) {
      e.preventDefault();
      return this.model.togglePassThrough();
    };

    Settings.prototype.onStart = function(e) {
      e.preventDefault();
      this.$(".stop-stream").show();
      this.$(".start-stream").hide();
      this.$("input, select").attr({
        disabled: "disabled"
      });
      return this.node.startStream();
    };

    Settings.prototype.onStop = function(e) {
      e.preventDefault();
      this.$(".stop-stream").hide();
      this.$(".start-stream").show();
      this.$("input, select").removeAttr("disabled");
      return this.node.stopStream();
    };

    Settings.prototype.onSubmit = function(e) {
      return e.preventDefault();
    };

    return Settings;

  })(Backbone.View);

  $(function() {
    Webcaster.mixer = new Webcaster.Model.Mixer({
      slider: 0
    });
    Webcaster.settings = new Webcaster.Model.Settings({
      uri: "ws://source:hackme@localhost:8080/mount",
      bitrate: 128,
      bitrates: [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 192, 224, 256, 320],
      samplerate: 44100,
      samplerates: [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000],
      channels: 2,
      encoder: "mp3",
      asynchronous: false,
      passThrough: false,
      mad: false
    }, {
      mixer: Webcaster.mixer
    });
    Webcaster.node = new Webcaster.Node({
      model: Webcaster.settings
    });
    _.extend(Webcaster, {
      views: {
        settings: new Webcaster.View.Settings({
          model: Webcaster.settings,
          node: Webcaster.node,
          el: $("div.settings")
        }),
        mixer: new Webcaster.View.Mixer({
          model: Webcaster.mixer,
          el: $("div.mixer")
        }),
        microphone: new Webcaster.View.Microphone({
          model: new Webcaster.Model.Microphone({
            trackGain: 100,
            passThrough: false
          }, {
            mixer: Webcaster.mixer,
            node: Webcaster.node
          }),
          el: $("div.microphone")
        }),
        playlistLeft: new Webcaster.View.Playlist({
          model: new Webcaster.Model.Playlist({
            side: "left",
            files: [],
            fileIndex: -1,
            volumeLeft: 0,
            volumeRight: 0,
            trackGain: 100,
            passThrough: false,
            position: 0.0,
            loop: false
          }, {
            mixer: Webcaster.mixer,
            node: Webcaster.node
          }),
          el: $("div.playlist-left")
        }),
        playlistRight: new Webcaster.View.Playlist({
          model: new Webcaster.Model.Playlist({
            side: "right",
            files: [],
            fileIndex: -1,
            volumeLeft: 0,
            volumeRight: 0,
            trackGain: 100,
            passThrough: false,
            position: 0.0,
            loop: false
          }, {
            mixer: Webcaster.mixer,
            node: Webcaster.node
          }),
          el: $("div.playlist-right")
        })
      }
    });
    return _.invoke(Webcaster.views, "render");
  });

}).call(this);
