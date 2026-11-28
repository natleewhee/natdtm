'use client'

// Proof-of-concept: a walkable 3D hub where the avatar roams between
// "booths," each one a real natdtm tool route. WASD/arrow keys move the
// avatar; walking into a booth's radius surfaces a prompt, Enter navigates.
// Reuses the same procedural character from DataAvatar.js (no Mixamo/GLTF
// asset here either) so a future rigged-model swap only touches one place.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { buildCharacter } from './DataAvatar'

export const BOOTHS = [
  { href: '/insure', name: 'InsureCheck', color: 0xe2564a, position: [-6, 0, -4] },
  { href: '/drive', name: 'DriveReady', color: 0x5b9bd1, position: [-6, 0, 4] },
  { href: '/etf', name: 'WhatETF', color: 0x4caf7d, position: [0, 0, -7] },
  { href: '/house', name: 'HouseMuch', color: 0xd9a441, position: [6, 0, -4] },
  { href: '/retire', name: 'RetireWell', color: 0xc4b5fd, position: [6, 0, 4] },
  { href: '/tax', name: 'TaxWise', color: 0xab9a8c, position: [0, 0, 7] },
  { href: '/ledger', name: 'MyLedger', color: 0xf0cf8f, position: [0, 0, 0] },
]

const BOOTH_RADIUS = 1.8
const MOVE_SPEED = 4.2

function buildBooth(booth: Record<string, any>) {
  const group = new THREE.Group()
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.0, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: booth.color }),
  )
  pedestal.position.y = 0.15
  group.add(pedestal)

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.8, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x8a8070 }),
  )
  post.position.y = 1.2
  group.add(post)

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.6, 0.08),
    new THREE.MeshStandardMaterial({ color: booth.color }),
  )
  sign.position.y = 2.1
  group.add(sign)

  group.position.set(...(booth.position as [number, number, number]))
  return group
}

export default function WorldHub() {
  const mountRef = useRef<any>(null)
  const router = useRouter()
  const [nearbyBooth, setNearbyBooth] = useState<any>(null)
  const nearbyBoothRef = useRef<any>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xcfe3f0)
    scene.fog = new THREE.Fog(0xcfe3f0, 14, 32)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(5, 8, 3)
    scene.add(dir)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0xe3ddcc }),
    )
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    BOOTHS.forEach(booth => scene.add(buildBooth(booth)))

    const character = buildCharacter()
    scene.add(character.group)

    const keys: Record<string, any> = {}
    const onKeyDown = (e: Record<string, any>) => { keys[e.key.toLowerCase()] = true }
    const onKeyUp = (e: Record<string, any>) => {
      keys[e.key.toLowerCase()] = false
      if (e.key === 'Enter' && nearbyBoothRef.current) {
        router.push(nearbyBoothRef.current.href)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const clock = new THREE.Clock()
    let frameId: number

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.getElapsedTime()

      const moveX = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0)
      const moveZ = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0)
      const moving = moveX !== 0 || moveZ !== 0
      const { group, legL, legR, armL, armR } = character

      if (moving) {
        const len = Math.hypot(moveX, moveZ) || 1
        const dx = (moveX / len) * MOVE_SPEED * dt
        const dz = (moveZ / len) * MOVE_SPEED * dt
        group.position.x += dx
        group.position.z += dz
        const targetAngle = Math.atan2(dx, dz)
        group.rotation.y = targetAngle

        const swing = Math.sin(t * 8)
        legL.rotation.x = swing * 0.6
        legR.rotation.x = -swing * 0.6
        armL.rotation.x = -swing * 0.5
        armR.rotation.x = swing * 0.5
        group.position.y = Math.abs(Math.sin(t * 8)) * 0.05
      } else {
        group.position.y = Math.sin(t * 1.5) * 0.02
        legL.rotation.x = 0
        legR.rotation.x = 0
        armL.rotation.x = Math.sin(t * 1.2) * 0.05
        armR.rotation.x = -Math.sin(t * 1.2) * 0.05
      }

      // Proximity check against every booth; nearest within radius wins.
      let nearest: any = null
      let nearestDist = BOOTH_RADIUS
      BOOTHS.forEach(booth => {
        const [bx, , bz] = booth.position
        const d = Math.hypot(group.position.x - bx, group.position.z - bz)
        if (d < nearestDist) { nearest = booth; nearestDist = d }
      })
      if (nearest?.href !== nearbyBoothRef.current?.href) {
        nearbyBoothRef.current = nearest
        setNearbyBooth(nearest)
      }

      // Third-person follow camera, smoothed.
      const camTarget = new THREE.Vector3(group.position.x, group.position.y + 4.5, group.position.z + 7)
      camera.position.lerp(camTarget, 0.08)
      camera.lookAt(group.position.x, group.position.y + 1, group.position.z)

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    tick()

    function handleResize() {
      const w = mount!.clientWidth
      const h = mount!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [router])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: 520, borderRadius: 12, overflow: 'hidden' }} />
      {nearbyBooth && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,20,20,0.85)', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: 14, fontWeight: 600, pointerEvents: 'none',
        }}>
          Press <kbd>Enter</kbd> to visit {nearbyBooth.name}
        </div>
      )}
      <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, opacity: 0.7 }}>
        WASD or arrow keys to walk. Walk up to a booth and press Enter.
      </p>
    </div>
  )
}
