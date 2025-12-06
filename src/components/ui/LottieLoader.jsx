import React from 'react';
import Lottie from 'lottie-react';

export default function LottieLoader({ size = 80, className = "" }) {
  // Using a popular free Lottie animation for loading
  const loadingAnimation = {
    "v": "5.7.4",
    "fr": 60,
    "ip": 0,
    "op": 60,
    "w": 100,
    "h": 100,
    "nm": "Loading",
    "ddd": 0,
    "assets": [],
    "layers": [
      {
        "ddd": 0,
        "ind": 1,
        "ty": 4,
        "nm": "Circle",
        "sr": 1,
        "ks": {
          "o": { "a": 0, "k": 100 },
          "r": {
            "a": 1,
            "k": [
              { "t": 0, "s": [0], "h": 0 },
              { "t": 60, "s": [360], "h": 0 }
            ]
          },
          "p": { "a": 0, "k": [50, 50, 0] },
          "a": { "a": 0, "k": [0, 0, 0] },
          "s": { "a": 0, "k": [100, 100, 100] }
        },
        "ao": 0,
        "shapes": [
          {
            "ty": "gr",
            "it": [
              {
                "d": 1,
                "ty": "el",
                "s": { "a": 0, "k": [60, 60] },
                "p": { "a": 0, "k": [0, 0] }
              },
              {
                "ty": "st",
                "c": { "a": 0, "k": [0.98, 0.79, 0.83, 1] },
                "o": { "a": 0, "k": 100 },
                "w": { "a": 0, "k": 8 },
                "lc": 2,
                "lj": 1
              },
              {
                "ty": "tr",
                "p": { "a": 0, "k": [0, 0] },
                "a": { "a": 0, "k": [0, 0] },
                "s": { "a": 0, "k": [100, 100] },
                "r": { "a": 0, "k": 0 },
                "o": { "a": 0, "k": 100 }
              }
            ]
          },
          {
            "ty": "tm",
            "s": { "a": 0, "k": 0 },
            "e": {
              "a": 1,
              "k": [
                { "t": 0, "s": [0], "h": 0 },
                { "t": 30, "s": [100], "h": 0 },
                { "t": 60, "s": [0], "h": 0 }
              ]
            },
            "o": { "a": 0, "k": 0 },
            "m": 1
          }
        ],
        "ip": 0,
        "op": 600,
        "st": 0,
        "bm": 0
      }
    ]
  };

  return (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <Lottie animationData={loadingAnimation} loop={true} />
    </div>
  );
}