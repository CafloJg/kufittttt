import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { WorkoutVideo } from '../types/user';

interface WorkoutVideoPlayerProps {
  video: WorkoutVideo;
  onComplete: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

function WorkoutVideoPlayer({ video, onComplete, onNext, onPrevious }: WorkoutVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(videoRef.current?.currentTime || 0);
      });
      
      videoRef.current.addEventListener('loadedmetadata', () => {
        setDuration(videoRef.current?.duration || 0);
      });
      
      videoRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        onComplete();
      });
    }
  }, [onComplete]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden">
      <video
        ref={videoRef}
        src={video.url}
        className="w-full aspect-video"
        poster={video.thumbnailUrl}
      />

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress bar */}
        <div className="relative w-full h-1 bg-white/20 rounded-full mb-4">
          <div
            className="absolute h-full bg-primary-500 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onPrevious && (
              <button
                onClick={onPrevious}
                className="text-white hover:text-primary-500 transition-colors"
              >
                <SkipBack size={24} />
              </button>
            )}

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {onNext && (
              <button
                onClick={onNext}
                className="text-white hover:text-primary-500 transition-colors"
              >
                <SkipForward size={24} />
              </button>
            )}

            <button
              onClick={toggleMute}
              className="text-white hover:text-primary-500 transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="text-white text-sm font-medium">
            {video.title}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkoutVideoPlayer;