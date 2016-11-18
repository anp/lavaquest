import Exponent from 'exponent';
import React from 'react';
import { Alert, Dimensions, PanResponder, Text, View } from 'react-native';

const THREE = require('three');
const THREEView = Exponent.createTHREEViewClass(THREE);

import Assets from '../Assets';

export default (viewProps) => {
  // constants
  const BALL_RADIUS = 40;
  const PLAYER_WH = 75;
  const PLAYER_L = 125;
  const { width, height } = Dimensions.get('window');

  // game state
  let playerHealth = 100;
  let distanceTraveled = 0;
  let goodBalls = new Array();
  let timeSinceGoodBall = 0;
  let timeUntilGoodBall = 0.3;
  let timeElapsed = 0;


  //// Scene, sprites

  // We just use a regular `THREE.Scene`
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(80, 1, 1, 10000);
  camera.position.z = 1000;

  const playerGeometry = new THREE.BoxGeometry(PLAYER_WH, PLAYER_WH, PLAYER_L);

  // TODO make a better texture & mesh for player
  const texture = THREEView.textureFromAsset(Assets['player-sprite']);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  const playerMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x00ffff,    // Sprites can be tinted with a color.
    transparent: true,  // Use the image's alpha channel for alpha.
  });

  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.position.z = 50;
  playerMesh.rotation.z = Math.PI;
  scene.add(playerMesh);

  const playerLight = new THREE.SpotLight(0xffffff);
  playerLight.power = 10000;
  playerLight.penumbra = 0.7;
  playerLight.decay = 1;
  playerLight.position.z = 50;
  playerLight.castShadow = true;
  playerLight.shadow.mapSize.width = 512;
  playerLight.shadow.mapSize.height = 512;
  playerLight.shadow.camera.near = 100;
  playerLight.shadow.camera.far = 4000;
  playerLight.shadow.camera.fov = 70;
  scene.add(playerLight);

  const playerLightTarget= new THREE.Object3D();
  playerLightTarget.position.z = -1000;
  playerLight.target = playerLightTarget;
  scene.add(playerLightTarget);

  const goodMaterial = new THREE.MeshStandardMaterial({color: 0xaa0000});
  const sphereGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);

  //// Events

  const restart = () => {
    for (let ball of goodBalls) {
      scene.remove(ball);
    }

    playerHealth = 100;
    distanceTraveled = 0;
    goodBalls = new Array();
    timeSinceGoodBall = 0;
    timeUntilGoodBall = 0.3;
    timeElapsed = 0;

    playerMesh.position.x = 0;
    playerMesh.position.y = 0;
  }

  // This function is called every frame, with `dt` being the time in seconds
  // elapsed since the last call.
  const tick = (dt) => {
    timeElapsed += dt;
    timeSinceGoodBall += dt;

    if (timeUntilGoodBall >= 0.001) {
      timeUntilGoodBall -= 0.00035;
    }

    // add a new good ball at a random position
    if (timeSinceGoodBall > timeUntilGoodBall) {
      let newGoodBall = new THREE.Mesh(sphereGeometry, goodMaterial);
      newGoodBall.position.x = ((Math.random() * width * 5) - ((width * 5) / 2));
      newGoodBall.position.y = ((Math.random() * height * 5) - ((height * 5) / 2));
      newGoodBall.position.z = -500;
      goodBalls.push(newGoodBall);
      scene.add(newGoodBall);
      timeSinceGoodBall = 0;
    }

    const zTick = 400 * dt;
    distanceTraveled += zTick / 1000;

    const ballsLeft = new Array();
    for (let goodBall of goodBalls) {
      goodBall.position.z += zTick;

      if (goodBall.position.z <= (camera.position.z - 400)) {

        // detect collision with player
        let distance = goodBall.position.distanceTo(playerMesh.position);
        if (distance <= PLAYER_WH + BALL_RADIUS) {
          // TODO show sparks
          playerHealth -= 300 / distance;
          console.log('player health', playerHealth);
          scene.remove(goodBall);
        } else {
          // only keep the ball if it doesn't collide
          ballsLeft.push(goodBall);
        }
      } else {
        scene.remove(goodBall);
      }
    }

    goodBalls = ballsLeft;

    // TODO change player color based on health


    // if player health <= 0, display loss and restart game
    if (playerHealth <= 0) {
      restart();
    }
  }

  // These functions are called on touch and release of the view respectively.
  const touch = (_, gesture) => {
    // move the player and light to the touched location
    const newX = (gesture.x0 - (width / 2)) * 5;
    const newY = -(gesture.y0 - (height/2)) * 5;
    playerMesh.position.x = newX;
    playerMesh.position.y = newY;
    playerLight.position.x = newX;
    playerLight.position.y = newY;
    playerLightTarget.position.x = newX;
    playerLightTarget.position.y = newY;
  };
  const release = (_, gesture) => {
    return;
  }

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
