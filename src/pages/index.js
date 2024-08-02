import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://webrtc-production-2ed7.up.railway.app/');

export default function Home() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Not Connected');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    if (!roomId) return;

    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate, roomId);
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setConnectionStatus('Connected');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionStatus('Disconnected');
      }
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    });

    socket.on('offer', async (data) => {
      if (pc.signalingState !== 'stable') {
        console.warn('Received offer in wrong state:', pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', answer, roomId);
    });

    socket.on('answer', async (data) => {
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('Received answer in wrong state:', pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data));
    });

    socket.on('candidate', async (data) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      } catch (error) {
        console.error('Error adding received ice candidate', error);
      }
    });

    setPeerConnection(pc);

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
      pc.close();
    };
  }, [roomId]);

  const createOffer = async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, roomId);
    setConnectionStatus('Connecting...');
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
      localVideoRef.current.srcObject = stream; // Show the screen stream locally
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const joinRoom = () => {
    socket.emit('join-room', roomId);
  };

  return (
    <div>
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter Room ID"
      />
      <button onClick={joinRoom}>Join Room</button>
      <video ref={localVideoRef} autoPlay playsInline></video>
      <video ref={remoteVideoRef} autoPlay playsInline></video>
      <button onClick={createOffer}>Call</button>
      <button onClick={startScreenShare}>Share Screen</button>
      <div>Status: {connectionStatus}</div>
    </div>
  );                  
}
