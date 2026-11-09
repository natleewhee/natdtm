'use client'

// Proof-of-concept: a Three.js character whose animation state is driven by
// a single numeric score (0-100), standing in for a real computed value
// (WhatETF risk score, MyLedger goal-progress %, etc.) rather than a chart.
// The character itself is built from primitives — no external Mixamo/GLTF
// asset — so this has zero asset-licensing or download dependency; swapping
// in a rigged GLTF model + AnimationMixer later is a drop-in replacement
// for the `tick()` function below, not a rewrite of the state logic.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function scoreToState(score) {
  if (score < 34) return 'idle'
  if (score < 67) return 'walk'
  return 'celebrate'
}

function buildCharacter() {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: 0x4f8ef7 })
  const accent = new THREE.MeshStandardMaterial({ color: 0xf7c04f })

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), material)
  torso.position.y = 1.1
  group.add(torso)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), accent)
  head.position.y = 1.75
  group.add(head)

  const limbGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18)
  const legL = new THREE.Mesh(limbGeo, material)
  legL.position.set(-0.17, 0.35, 0)
  legL.geometry = legL.geometry.clone()
  legL.geometry.translate(0, 0.35, 0) // pivot at hip
  legL.position.y = 0.7
  group.add(legL)

  const legR = legL.clone()
  legR.position.x = 0.17
  group.add(legR)

  const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15)
  armGeo.translate(0, 0.3, 0) // pivot at shoulder
  const armL = new THREE.Mesh(armGeo, accent)
  armL.position.set(-0.42, 1.45, 0)
  group.add(armL)

  const armR = armL.clone()
  armR.position.x = 0.42
  group.add(armR)

  return { group, torso, head, legL, legR, armL, armR }
}

export default function DataAvatar({ score = 50, label = 'Score' }) {
  const mountRef = useRef(null)
  const scoreRef = useRef(score)
  scoreRef.current = score

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f1ea)

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 1.6, 4.2)
    camera.lookAt(0, 1, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(2, 4, 3)
    scene.add(dir)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 32),
      new THREE.MeshStandardMaterial({ color: 0xe3ddcc }),
    )
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    const character = buildCharacter()
    scene.add(character.group)

    const clock = new THREE.Clock()
    let frameId

    function tick() {
      const t = clock.getElapsedTime()
      const state = scoreToState(scoreRef.current)
      const { group, legL, legR, armL, armR } = character

      if (state === 'idle') {
        group.position.y = Math.sin(t * 1.5) * 0.02
        legL.rotation.x = 0
        legR.rotation.x = 0
        armL.rotation.x = Math.sin(t * 1.2) * 0.05
        armR.rotation.x = -Math.sin(t * 1.2) * 0.05
        group.rotation.y += 0.002
      } else if (state === 'walk') {
        const swing = Math.sin(t * 6)
        legL.rotation.x = swing * 0.6
        legR.rotation.x = -swing * 0.6
        armL.rotation.x = -swing * 0.5
        armR.rotation.x = swing * 0.5
        group.position.y = Math.abs(Math.sin(t * 6)) * 0.05
        group.rotation.y += 0.012
      } else {
        const bounce = Math.abs(Math.sin(t * 8))
        group.position.y = bounce * 0.3
        legL.rotation.x = -0.3
        legR.rotation.x = -0.3
        armL.rotation.x = -2.6
        armR.rotation.x = -2.6
        armL.rotation.z = Math.sin(t * 8) * 0.3
        armR.rotation.z = -Math.sin(t * 8) * 0.3
        group.rotation.y += 0.02
      }

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    tick()

    function handleResize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', height: 360, borderRadius: 12, overflow: 'hidden' }} />
      <p style={{ textAlign: 'center', marginTop: 8, fontSize: 14, opacity: 0.7 }}>
        {label}: {score} — {scoreToState(score)}
      </p>
    </div>
  )
}
