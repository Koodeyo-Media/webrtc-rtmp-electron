import React, { createRef, useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [RTMP_ADDRESS, setRtmpAddress] = useState("rtmp://127.0.0.1/live");
  const [STREAM_KEY, setStreamKey] = useState("STREAM_NAME");
  const [PUBLISHING, setPublishing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [videoInput, changeVideoInput] = useState("");
  const [audioInput, changeAudioInput] = useState("");
  const stopVideoBtn = useRef();
  const muteButton = useRef();
  const VideoLoopbackElement = useRef();
  const VideoStreamRef = createRef();
  const peer = createRef();

  const audioDevices = function () {
    return devices.filter((device) => device.kind === "audioinput");
  };

  const videoDevices = function () {
    return devices.filter((device) => device.kind === "videoinput");
  };

  let onSdpOffer = (event, sdpAnswer) => {
    peer.current
      .setRemoteDescription(sdpAnswer)
      .then(() => {
        window.ipcRenderer.send("start", {
          RTMP_ADDRESS,
          STREAM_KEY,
        });
      })
      .catch((err) => console.error(err));
  };

  let onStart = () => {
    setPublishing(true);
  };

  let onStop = () => {
    setPublishing(false);
  };

  const getUserMedia = () => {
    if (!devices.length) return;

    if (!peer.current) {
      peer.current = new RTCPeerConnection({
        sdpSemantics: "unified-plan",
      });
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: audioInput.length ? audioInput : audioDevices()[0].deviceId,
        },
        video: {
          deviceId: videoInput.length ? videoInput : videoDevices()[0].deviceId,
        },
      })
      .then((cameraStream) => {
        VideoStreamRef.current = cameraStream;
        VideoLoopbackElement.current.srcObject = cameraStream;

        cameraStream.getTracks().forEach((track) =>
          peer.current?.addTransceiver(track, {
            direction: "sendrecv",
            streams: [cameraStream],
          })
        );
      });
  };

  const initiate = () => {
    navigator.mediaDevices
      .enumerateDevices()
      .then(setDevices)
      .catch(function (err) {
        console.log(err.name + ": " + err.message);
      });
  };

  useEffect(() => {
    window.ipcRenderer.on("sdpAnswer", onSdpOffer);
    window.ipcRenderer.on("started", onStart);
    window.ipcRenderer.on("stopped", onStop);

    return () => {
      window.ipcRenderer.removeListener("sdpAnswer");
      window.ipcRenderer.removeListener("started");
      window.ipcRenderer.removeListener("stopped");
    };
  }, []);

  useEffect(initiate, []);
  useEffect(getUserMedia, [devices, audioInput, videoInput]);

  const stopVideo = () => {
    const enabled = VideoStreamRef.current.getVideoTracks()[0].enabled;

    if (enabled) {
      VideoStreamRef.current.getVideoTracks()[0].enabled = false;
      stopVideoBtn.current.classList.toggle("background__red");
      stopVideoBtn.current.innerHTML = `<i class="fas fa-video-slash"></i>`;
    } else {
      VideoStreamRef.current.getVideoTracks()[0].enabled = true;
      stopVideoBtn.current.classList.toggle("background__red");
      stopVideoBtn.current.innerHTML = `<i class="fas fa-video"></i>`;
    }
  };

  const mute = () => {
    const enabled = VideoStreamRef.current.getAudioTracks()[0].enabled;

    if (enabled) {
      VideoStreamRef.current.getAudioTracks()[0].enabled = false;
      muteButton.current.classList.toggle("background__red");
      muteButton.current.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
    } else {
      VideoStreamRef.current.getAudioTracks()[0].enabled = true;
      muteButton.current.classList.toggle("background__red");
      muteButton.current.innerHTML = `<i class="fas fa-microphone"></i>`;
    }
  };

  const options = () => {
    document.querySelector(".main__right").style.display = "flex";
    document.querySelector(".main__right").style.flex = "1";
    document.querySelector(".main__left").style.display = "none";
    document.querySelector(".header__back").style.display = "block";
  };

  const backBtn = () => {
    document.querySelector(".main__left").style.display = "flex";
    document.querySelector(".main__left").style.flex = "1";
    document.querySelector(".main__right").style.display = "none";
    document.querySelector(".header__back").style.display = "none";
  };

  const publish = () => {
    if (!PUBLISHING) {
      peer.current
        ?.createOffer()
        .then((offer) => peer.current.setLocalDescription(offer))
        .then(() =>
          window.ipcRenderer.send(
            "sdpOffer",
            JSON.parse(JSON.stringify(peer.current.localDescription))
          )
        );
    } else {
      window.ipcRenderer.send("stop");
    }
  };

  return (
    <div className="App">
      <div className="header">
        <div className="logo">
          <div className="header__back" onClick={backBtn}>
            <i className="fas fa-angle-left"></i>
          </div>
          <h3>WEBRTC - PRODUCER</h3>
        </div>
      </div>
      <div className="main">
        <div className="main__left">
          <div className="videos__group">
            <div id="video-grid">
              <video
                id="video-loopback"
                ref={VideoLoopbackElement}
                autoPlay
                muted
                playsInline
              />
            </div>
          </div>
          <div className="options">
            <div className="options__left">
              <div
                id="stopVideo"
                ref={stopVideoBtn}
                className="options__button"
                onClick={stopVideo}
              >
                <i className="fa fa-video-camera"></i>
              </div>
              <div
                id="muteButton"
                ref={muteButton}
                className="options__button"
                onClick={mute}
              >
                <i className="fa fa-microphone"></i>
              </div>
              <div
                id="moreOptions"
                className="options__button"
                onClick={options}
              >
                <i className="fa fa-sliders"></i>
              </div>
            </div>
            <div className="options__right">
              <div id="publish" className="go_live__button" onClick={publish}>
                <i className="fa fa-live"></i>
                {PUBLISHING ? "Stop" : "GO Live"}
              </div>
            </div>
          </div>
        </div>
        <div className="main__right">
          <div className="more_options_window">
            <div className="more_options">
              <p>
                <label className="w3-text-blue">
                  <b>AUDIO INPUT</b>
                </label>
                <select
                  className="w3-input w3-border"
                  onChange={(e) => changeAudioInput(e.target.value)}
                >
                  {audioDevices().map((deviceInfo, index) => (
                    <option key={index} value={deviceInfo.deviceId}>
                      {deviceInfo.label || `Microphone ${index}`}
                    </option>
                  ))}
                </select>
              </p>
              <p>
                <label className="w3-text-blue">
                  <b>CAMERA INPUT</b>
                </label>
                <select
                  className="w3-input w3-border"
                  onChange={(e) => changeVideoInput(e.target.value)}
                >
                  {videoDevices().map((deviceInfo, index) => (
                    <option key={index} value={deviceInfo.deviceId}>
                      {deviceInfo.label || `Camera ${index}`}
                    </option>
                  ))}
                </select>
              </p>
              <p>
                <label className="w3-text-blue">
                  <b>RTMP ADDRESS</b>
                </label>
                <input
                  className="w3-input w3-border"
                  type="text"
                  value={RTMP_ADDRESS}
                  onChange={(e) => setRtmpAddress(e.target.value)}
                />
              </p>
              <p>
                <label className="w3-text-blue">
                  <b>STREAM KEY</b>
                </label>
                <input
                  className="w3-input w3-border"
                  type="text"
                  value={STREAM_KEY}
                  onChange={(e) => setStreamKey(e.target.value)}
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
