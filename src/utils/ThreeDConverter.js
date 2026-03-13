/**
 * ThreeDConverter.js
 * Browser-side 3D file format conversion using Three.js loaders/exporters.
 * Supports: OBJ, FBX, glTF/GLB, STL, DAE (Collada), PLY
 */

class ThreeDConverter {
  constructor() {
    this._THREE = null;
  }

  // ─── Format metadata ────────────────────────────────────────────────────────

  getMimeType(format) {
    const map = {
      obj:  'model/obj',
      gltf: 'model/gltf+json',
      glb:  'model/gltf-binary',
      stl:  'model/stl',
      ply:  'application/x-ply',
    };
    return map[format.toLowerCase()] || 'application/octet-stream';
  }

  getFormatLabel(format) {
    const labels = {
      obj:  'Wavefront OBJ',
      fbx:  'Autodesk FBX',
      gltf: 'glTF 2.0 (JSON)',
      glb:  'glTF Binary (GLB)',
      stl:  'STL (3D Print)',
      ply:  'Stanford PLY',
      dae:  'COLLADA (DAE)',
    };
    return labels[format.toLowerCase()] || format.toUpperCase();
  }

  /** File extensions the converter accepts as input */
  get acceptedExtensions() {
    return ['.obj', '.fbx', '.gltf', '.glb', '.stl', '.dae', '.ply'];
  }

  get acceptAttribute() {
    return this.acceptedExtensions.join(',');
  }

  /**
   * Returns valid output formats for a given input extension.
   * FBX has no JS exporter — output is limited, but import still works for round-trips.
   */
  getSupportedOutputFormats(inputExt) {
    const ext = inputExt.toLowerCase().replace('.', '');
    // All supported output formats
    const allOutputs = ['obj', 'gltf', 'glb', 'stl', 'ply'];
    // Remove the same-format round-trip and equivalent-format duplicates
    return allOutputs.filter(f => {
      if (f === ext) return false;
      if (ext === 'gltf' && f === 'glb') return false; // near-identical; keep glb→gltf useful
      if (ext === 'glb' && f === 'gltf') return true;
      return true;
    });
  }

  // ─── Three.js bootstrap ─────────────────────────────────────────────────────

  async _loadThree() {
    if (this._THREE) return this._THREE;
    this._THREE = await import('three');
    return this._THREE;
  }

  // ─── Loaders ────────────────────────────────────────────────────────────────

  /**
   * Parse a File into a THREE.Object3D (or scene Group).
   * Returns { object, animations } where animations may be empty.
   */
  async _loadFile(file) {
    const THREE = await this._loadThree();
    const ext = file.name.split('.').pop().toLowerCase();
    const buffer = await file.arrayBuffer();

    switch (ext) {
      case 'obj': {
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
        const loader = new OBJLoader();
        const text = new TextDecoder().decode(buffer);
        const object = loader.parse(text);
        return { object, animations: [] };
      }

      case 'fbx': {
        const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
        const loader = new FBXLoader();
        const object = loader.parse(buffer, '');
        return { object, animations: object.animations || [] };
      }

      case 'gltf':
      case 'glb': {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        const gltf = await new Promise((resolve, reject) =>
          loader.parse(buffer, '', resolve, reject)
        );
        return { object: gltf.scene, animations: gltf.animations || [] };
      }

      case 'stl': {
        const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
        const loader = new STLLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const object = new THREE.Mesh(geometry, material);
        return { object, animations: [] };
      }

      case 'dae': {
        const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
        const loader = new ColladaLoader();
        const text = new TextDecoder().decode(buffer);
        const collada = loader.parse(text, '');
        return { object: collada.scene, animations: [] };
      }

      case 'ply': {
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
        const loader = new PLYLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({ color: 0x808080, vertexColors: geometry.hasAttribute('color') });
        const object = new THREE.Mesh(geometry, material);
        return { object, animations: [] };
      }

      default:
        throw new Error(`Unsupported input format: .${ext}`);
    }
  }

  // ─── Exporters ──────────────────────────────────────────────────────────────

  async _exportObject(object, animations, outputFormat) {
    const ext = outputFormat.toLowerCase();

    switch (ext) {
      case 'obj': {
        const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
        const exporter = new OBJExporter();
        const result = exporter.parse(object);
        return new Blob([result], { type: 'model/obj' });
      }

      case 'gltf': {
        const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();
        const result = await new Promise((resolve, reject) =>
          exporter.parse(object, resolve, reject, { binary: false, animations })
        );
        return new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });
      }

      case 'glb': {
        const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();
        const result = await new Promise((resolve, reject) =>
          exporter.parse(object, resolve, reject, { binary: true, animations })
        );
        return new Blob([result], { type: 'model/gltf-binary' });
      }

      case 'stl': {
        const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
        const exporter = new STLExporter();
        const result = exporter.parse(object, { binary: false });
        return new Blob([result], { type: 'model/stl' });
      }

      case 'ply': {
        const { PLYExporter } = await import('three/examples/jsm/exporters/PLYExporter.js');
        const exporter = new PLYExporter();
        // PLYExporter.parse can be synchronous or callback-based depending on version
        let result;
        const parsed = exporter.parse(object, (r) => { result = r; }, { binary: false });
        if (result === undefined) result = parsed; // newer three.js returns directly
        return new Blob([result], { type: 'application/x-ply' });
      }

      default:
        throw new Error(`Unsupported output format: .${ext}`);
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Convert a 3D file to the target format.
   * @param {File} file - Input file
   * @param {string} outputFormat - Target extension (e.g. 'glb')
   * @param {Function} onProgress - (percent: number, message: string) => void
   * @returns {{ blob, filename, originalSize, convertedSize, mimeType }}
   */
  async convert(file, outputFormat, onProgress) {
    onProgress?.(5, 'Loading Three.js engine...');
    await this._loadThree();

    onProgress?.(20, `Parsing ${file.name.split('.').pop().toUpperCase()} file...`);
    const { object, animations } = await this._loadFile(file);

    onProgress?.(60, `Exporting to ${outputFormat.toUpperCase()}...`);
    const blob = await this._exportObject(object, animations, outputFormat);

    onProgress?.(95, 'Finalizing...');

    const inputExt = file.name.split('.').pop().toLowerCase();
    const basename = file.name.slice(0, -(inputExt.length + 1));
    const filename = `${basename}.${outputFormat}`;

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename,
      originalSize: file.size,
      convertedSize: blob.size,
      mimeType: this.getMimeType(outputFormat),
    };
  }
}

export default new ThreeDConverter();
