'use client'

import { useLayoutEffect, useRef } from 'react'
import type * as THREE from 'three'

interface InstancedProps {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  matrices: THREE.Matrix4[]
  colors?: THREE.Color[]
  castShadow?: boolean
  receiveShadow?: boolean
}

export function Instanced({ geometry, material, matrices, colors, castShadow, receiveShadow }: InstancedProps) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i])
      if (colors) mesh.setColorAt(i, colors[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [matrices, colors])

  if (matrices.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, matrices.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}
