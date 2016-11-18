import Exponent from 'exponent';
import React from 'react';
import { Alert, Dimensions, PanResponder } from 'react-native';

// Can't use `import ...` form because THREE uses oldskool module stuff.
const THREE = require('three');

// `THREEView` wraps a `GLView` and creates a THREE renderer that uses
// that `GLView`. The class needs to be constructed with a factory so that
// the `THREE` module can be injected without exponent-sdk depending on the
// `'three'` npm package.
const THREEView = Exponent.createTHREEViewClass(THREE);

import Assets from '../Assets';


//// Game

// Render the game as a `View` component.

export default (viewProps) => {
  const { width, height } = Dimensions.get('window');

  const camera = new THREE.PerspectiveCamera(80, 1, 1, 10000);
  camera.position.z = 1000;


  //// Scene, sprites

  // We just use a regular `THREE.Scene`
  const scene = new THREE.Scene();

  // Making a sprite involves three steps which are outlined below. You probably
  // would want to combine them into a utility function with defaults pertinent
  // to your game.

  // 1: Geometry
  // This defines the local shape of the object. In this case the geometry
  // will simply be a 1x1 plane facing the camera.
  const playerGeometry = new THREE.BoxGeometry(200, 200, 200);

  // 2: Material
  // This defines how the surface of the shape is painted. In this case we
  // want to paint a texture loaded from an asset and also tint it.
  // Nearest-neighbor filtering with `THREE.NearestFilter` is nice for
  // pixel art styles.
  const texture = THREEView.textureFromAsset(Assets['player-sprite']);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  const playerMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x00ffff,    // Sprites can be tinted with a color.
    transparent: true,  // Use the image's alpha channel for alpha.
  });



  // 3: Mesh
  // A mesh is a node in THREE's scenegraph and refers to a geometry and a
  // material to draw itself. It can be translated and rotated as any other
  // scenegraph node.

  const tunnelGeometry = new THREE.CylinderGeometry(500, 500, 2000, 32, 1, true);
  const tunnelMaterial = new THREE.MeshLambertMaterial({color: 0x00fff0});
  const tunnelMesh = new THREE.Mesh(tunnelGeometry, tunnelMaterial);

  tunnelMesh.rotation.x = Math.PI / 2;

  tunnelMesh.flipSided = true;
  scene.add(tunnelMesh);

  // Geometries and materials can be reused.
  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.position.z = 50;
  playerMesh.rotation.z = Math.PI;
  scene.add(playerMesh);

  const playerLight = new THREE.SpotLight(0xffffff);
  playerLight.power = 8;
  playerLight.penumbra = 0.4;
  playerLight.decay = 2;
  playerLight.position.z = 50;
  playerLight.castShadow = true;
  playerLight.shadow.mapSize.width = 1024;
  playerLight.shadow.mapSize.height = 1024;
  playerLight.shadow.camera.near = 500;
  playerLight.shadow.camera.far = 4000;
  playerLight.shadow.camera.fov = 70;
  scene.add(playerLight);

  let goodBalls = new Array();
  const badBalls = new Array();
  let timeSinceGoodBall = 0;
  let timeUntilGoodBall = 0.3;
  let timeElapsed = 0;

  const goodMaterial = new THREE.MeshLambertMaterial({color: 0xcc0000});
  const sphereGeometry = new THREE.SphereGeometry(20, 32, 32);

  //// Events

  // This function is called every frame, with `dt` being the time in seconds
  // elapsed since the last call.
  const tick = (dt) => {
    timeElapsed += dt;
    timeSinceGoodBall += dt;

    if (timeUntilGoodBall >= 0.001) {
      timeUntilGoodBall -= 0.0003;
    }

    // add a new good ball at a random position
    if (timeSinceGoodBall > timeUntilGoodBall) {
      let newGoodBall = new THREE.Mesh(sphereGeometry, goodMaterial);
      newGoodBall.position.x = ((Math.random() * width * 3) - ((width * 3) / 2));
      newGoodBall.position.y = ((Math.random() * height * 3) - ((height * 3) / 2));
      newGoodBall.position.z = -500;
      goodBalls.push(newGoodBall);
      scene.add(newGoodBall);
      timeSinceGoodBall = 0;
    }

    const zTick = 15;
    const ballsLeft = new Array();
    for (let goodBall of goodBalls) {
      goodBall.position.z += zTick;

      if (goodBall.position.z <= (camera.position.z - 400)) {
        ballsLeft.push(goodBall);
      } else {
        scene.remove(goodBall);
      }
    }
    goodBalls = ballsLeft;
  }

  // These functions are called on touch and release of the view respectively.
  const touch = (_, gesture) => {
    const newX = (gesture.x0 - (width / 2)) * 5;
    const newY = -(gesture.y0 - (height/2)) * 5;
    playerMesh.position.x = newX;
    playerMesh.position.y = newY;
    playerLight.position.x = newX;
    playerLight.position.y = newY;
  };
  const release = (_, gesture) => {
    return;
  }


  //// React component

  // We bind our `touch` and `release` callbacks using a `PanResponder`. The
  // `THREEView` takes our `scene` and `camera` and renders them every frame.
  // It also takes our `tick` callbacks and calls it every frame.
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: touch,
    onPanResponderRelease: release,
    onPanResponderTerminate: release,
    onShouldBlockNativeResponder: () => false,
  });
  return (
    <THREEView
      {...viewProps}
      {...panResponder.panHandlers}
      scene={scene}
      camera={camera}
      tick={tick}
    />
  );
};
