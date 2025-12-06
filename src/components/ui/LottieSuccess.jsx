import React from 'react';
import Lottie from 'lottie-react';

export default function LottieSuccess({ size = 120, className = "" }) {
  // Heart success animation
  const successAnimation = {
    "v": "5.7.4",
    "fr": 30,
    "ip": 0,
    "op": 60,
    "w": 100,
    "h": 100,
    "nm": "Success",
    "ddd": 0,
    "assets": [],
    "layers": [
      {
        "ddd": 0,
        "ind": 1,
        "ty": 4,
        "nm": "Heart",
        "sr": 1,
        "ks": {
          "o": { "a": 0, "k": 100 },
          "r": { "a": 0, "k": 0 },
          "p": { "a": 0, "k": [50, 50, 0] },
          "a": { "a": 0, "k": [0, 0, 0] },
          "s": {
            "a": 1,
            "k": [
              { "t": 0, "s": [0, 0, 100] },
              { "t": 15, "s": [120, 120, 100] },
              { "t": 30, "s": [100, 100, 100] }
            ]
          }
        },
        "ao": 0,
        "shapes": [
          {
            "ty": "gr",
            "it": [
              {
                "ind": 0,
                "ty": "sh",
                "ks": {
                  "a": 0,
                  "k": {
                    "i": [[0,0], [-5,-5], [-8,0], [-5,5], [0,8], [5,5], [20,15], [5,-5], [0,-8], [-5,-5], [-8,0]],
                    "o": [[0,0], [5,5], [8,0], [5,-5], [0,-8], [-5,-5], [-20,-15], [-5,5], [0,8], [5,5], [8,0]],
                    "v": [[0,10], [0,-5], [15,-15], [30,-5], [35,10], [30,25], [0,40], [-30,25], [-35,10], [-30,-5], [-15,-15]],
                    "c": true
                  }
                }
              },
              {
                "ty": "fl",
                "c": { "a": 0, "k": [0.98, 0.79, 0.83, 1] },
                "o": { "a": 0, "k": 100 }
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
      <Lottie animationData={successAnimation} loop={false} />
    </div>
  );
}