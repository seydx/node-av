import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_HWDEVICE_TYPE_CUDA,
  AV_HWDEVICE_TYPE_QSV,
  AV_HWDEVICE_TYPE_VAAPI,
  AV_HWDEVICE_TYPE_VDPAU,
  AV_HWDEVICE_TYPE_VIDEOTOOLBOX,
  FF_HWDEVICE_TYPE_CUDA,
  FF_HWDEVICE_TYPE_D3D11VA,
  FF_HWDEVICE_TYPE_OPENCL,
  FF_HWDEVICE_TYPE_QSV,
  FF_HWDEVICE_TYPE_VAAPI,
  FF_HWDEVICE_TYPE_VDPAU,
  FF_HWDEVICE_TYPE_VIDEOTOOLBOX,
  FF_HWDEVICE_TYPE_VULKAN,
  HardwareDeviceContext,
  type FFHWDeviceType,
} from '../src/index.js';

describe('HardwareDeviceContext', () => {
  describe('Static Methods', () => {
    it('should iterate over available hardware device types', () => {
      const types = HardwareDeviceContext.iterateTypes();

      assert.ok(Array.isArray(types), 'Should return array of types');
      assert.ok(types.length >= 0, 'Should return at least empty array');

      // Log available types for debugging
      for (const type of types) {
        const name = HardwareDeviceContext.getTypeName(type);
        console.log(`Available hardware type: ${name} (${type})`);
      }
    });

    it('should get type name for known types', () => {
      // Common hardware types (may not all be available on all systems)
      const commonTypes = [
        { type: AV_HWDEVICE_TYPE_CUDA, expectedName: 'cuda' },
        { type: AV_HWDEVICE_TYPE_VAAPI, expectedName: 'vaapi' },
        { type: AV_HWDEVICE_TYPE_VDPAU, expectedName: 'vdpau' },
        { type: AV_HWDEVICE_TYPE_VIDEOTOOLBOX, expectedName: 'videotoolbox' },
        { type: AV_HWDEVICE_TYPE_QSV, expectedName: 'qsv' },
      ];

      for (const { type, expectedName } of commonTypes) {
        const name = HardwareDeviceContext.getTypeName(type);
        if (name !== null) {
          assert.equal(name, expectedName, `Type ${type} should be ${expectedName}`);
        }
      }
    });

    it('should find device type by name', () => {
      // Test with common type names
      const names: FFHWDeviceType[] = [
        FF_HWDEVICE_TYPE_CUDA,
        FF_HWDEVICE_TYPE_VAAPI,
        FF_HWDEVICE_TYPE_VDPAU,
        FF_HWDEVICE_TYPE_VIDEOTOOLBOX,
        FF_HWDEVICE_TYPE_QSV,
        FF_HWDEVICE_TYPE_OPENCL,
        FF_HWDEVICE_TYPE_VULKAN,
      ];

      for (const name of names) {
        const type = HardwareDeviceContext.findTypeByName(name);
        // Type might be NONE if not available on this system
        assert.equal(typeof type, 'number', `Should return number for ${name}`);

        if (type !== 0) {
          // AV_HWDEVICE_TYPE_NONE
          // Verify round-trip
          const retrievedName = HardwareDeviceContext.getTypeName(type);
          assert.equal(retrievedName, name, `Should retrieve correct name for ${name}`);
        }
      }
    });

    it('should return NONE for unknown device type names', () => {
      const type = HardwareDeviceContext.findTypeByName('nonexistent_device' as any);
      assert.equal(type, 0, 'Should return AV_HWDEVICE_TYPE_NONE (0)');
    });

    it('should return null for invalid type number', () => {
      const name = HardwareDeviceContext.getTypeName(999 as any);
      assert.equal(name, null, 'Should return null for invalid type');
    });
  });

  describe('Creation and Lifecycle', () => {
    it('should create a new HardwareDeviceContext', () => {
      const device = new HardwareDeviceContext();
      assert.ok(device instanceof HardwareDeviceContext, 'Should create instance');
    });

    it('should allocate device context', () => {
      const device = new HardwareDeviceContext();

      // Find a type that's available on this system
      const types = HardwareDeviceContext.iterateTypes();
      if (types.length > 0) {
        device.alloc(types[0]);
        // Context is allocated but not initialized
        assert.ok(device, 'Should allocate context');
        device.free();
      } else {
        // No hardware acceleration available - skip
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should free device context', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        device.alloc(types[0]);
        device.free();
        // Should not crash
        assert.ok(true, 'Should free without error');
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should support Symbol.dispose', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        device.alloc(types[0]);

        if (typeof device[Symbol.dispose] === 'function') {
          device[Symbol.dispose]();
        }
        assert.ok(true, 'Should dispose without error');
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle multiple free calls safely', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        device.alloc(types[0]);
        device.free();
        device.free(); // Should not crash
        assert.ok(true, 'Should handle multiple free calls');
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Device Creation', () => {
    it('should attempt to create device with null parameters', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        // Try to create with the first available type
        const ret = device.create(types[0], null, null);

        // Result depends on hardware availability and permissions
        assert.equal(typeof ret, 'number', 'Should return status code');

        if (ret === 0) {
          // Successfully created
          device.free();
        }
        // Negative value means error, which is fine for tests
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should use the device string of each create call (no caching across calls)', () => {
      const types = HardwareDeviceContext.iterateTypes();
      const typeNames = types.map((t) => HardwareDeviceContext.getTypeName(t));

      // VideoToolbox rejects any non-empty device string ("Device selection
      // unsupported"), which makes the device string observable: if the first
      // call's (empty, accepted) device string were cached and reused, the
      // second call would incorrectly succeed.
      const vtIndex = typeNames.indexOf(FF_HWDEVICE_TYPE_VIDEOTOOLBOX);
      if (vtIndex === -1) {
        assert.ok(true, 'VideoToolbox not available');
        return;
      }
      const vtType = types[vtIndex];

      const first = new HardwareDeviceContext();
      const ret1 = first.create(vtType, '', null);
      if (ret1 !== 0) {
        first.free();
        assert.ok(true, 'VideoToolbox device creation not available');
        return;
      }

      const second = new HardwareDeviceContext();
      const ret2 = second.create(vtType, 'nonexistent-device', null);
      assert.ok(ret2 < 0, 'Second create must use its own device string and fail, not reuse the first');

      second.free();
      first.free();
    });

    it('should attempt to create from existing device', () => {
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const sourceDevice = new HardwareDeviceContext();
        const ret1 = sourceDevice.create(types[0], null, null);

        if (ret1 === 0) {
          // Source device created successfully
          const derivedDevice = new HardwareDeviceContext();
          const ret2 = derivedDevice.createDerived(sourceDevice, types[0]);

          assert.equal(typeof ret2, 'number', 'Should return status code');

          if (ret2 === 0) {
            derivedDevice.free();
          }
          sourceDevice.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Properties', () => {
    it('should get device type', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        device.alloc(types[0]);

        const type = device.type;
        assert.equal(typeof type, 'number', 'Should return device type');
        assert.equal(type, types[0], 'Should match allocated type');

        device.free();
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Constraints', () => {
    it('should attempt to get hardware frame constraints', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);

        if (ret === 0) {
          try {
            const constraints = device.getHwframeConstraints();

            if (constraints) {
              assert.ok(constraints, 'Should return constraints object');
              assert.equal(typeof constraints.minWidth, 'number', 'Should have minWidth');
              assert.equal(typeof constraints.minHeight, 'number', 'Should have minHeight');
              assert.equal(typeof constraints.maxWidth, 'number', 'Should have maxWidth');
              assert.equal(typeof constraints.maxHeight, 'number', 'Should have maxHeight');

              // Validate reasonable values
              assert.ok(constraints.minWidth >= 0, 'Min width should be non-negative');
              assert.ok(constraints.minHeight >= 0, 'Min height should be non-negative');
              assert.ok(constraints.maxWidth >= constraints.minWidth, 'Max width >= min width');
              assert.ok(constraints.maxHeight >= constraints.minHeight, 'Max height >= min height');
            } else {
              // Constraints might not be available for all device types
              assert.ok(true, 'No constraints available for this device');
            }
          } catch {
            // Some devices might not support constraints
            assert.ok(true, 'Device does not support constraints');
          }

          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Device Transfer', () => {
    it('should attempt transfer to another device', () => {
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const device1 = new HardwareDeviceContext();
        const ret1 = device1.create(types[0], null, null);

        if (ret1 === 0) {
          const device2 = new HardwareDeviceContext();
          const ret2 = device2.create(types[0], null, null);

          if (ret2 === 0) {
            // Note: transferDataTo/From would require frames context
            // This is just to verify the devices were created
            assert.ok(device1, 'Device 1 created');
            assert.ok(device2, 'Device 2 created');

            device2.free();
          }
          device1.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Reference Management', () => {
    it('should create derived device context', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);

        if (ret === 0) {
          // Test derived device creation (same type)
          const derivedDevice = new HardwareDeviceContext();
          const ret2 = derivedDevice.createDerived(device, types[0]);

          assert.equal(typeof ret2, 'number', 'Should return status code');
          // Derived from same type might not always work
          if (ret2 === 0) {
            assert.equal(derivedDevice.type, device.type, 'Should have same type');
            derivedDevice.free();
          }
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Platform-specific Tests', () => {
    it('should detect platform-appropriate hardware types', () => {
      const types = HardwareDeviceContext.iterateTypes();
      const typeNames = types.map((t) => HardwareDeviceContext.getTypeName(t));

      console.log('Available hardware types on this platform:', typeNames);

      // Platform detection
      const platform = process.platform;

      if (platform === 'darwin') {
        // macOS should have VideoToolbox
        const hasVideoToolbox = typeNames.includes(FF_HWDEVICE_TYPE_VIDEOTOOLBOX);
        console.log('macOS - VideoToolbox available:', hasVideoToolbox);
      } else if (platform === 'linux') {
        // Linux might have VAAPI, VDPAU, CUDA
        const hasVaapi = typeNames.includes(FF_HWDEVICE_TYPE_VAAPI);
        const hasCuda = typeNames.includes(FF_HWDEVICE_TYPE_CUDA);
        console.log('Linux - VAAPI available:', hasVaapi);
        console.log('Linux - CUDA available:', hasCuda);
      } else if (platform === 'win32') {
        // Windows might have D3D11VA, DXVA2, QSV, CUDA
        const hasD3d11va = typeNames.includes(FF_HWDEVICE_TYPE_D3D11VA);
        const hasQsv = typeNames.includes(FF_HWDEVICE_TYPE_QSV);
        console.log('Windows - D3D11VA available:', hasD3d11va);
        console.log('Windows - QSV available:', hasQsv);
      }

      assert.ok(true, `Platform ${platform} checked`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle creation with invalid type', () => {
      const device = new HardwareDeviceContext();

      // Try to create with invalid type
      const ret = device.create(999 as any, null, null);

      assert.equal(typeof ret, 'number', 'Should return status code');
      assert.ok(ret < 0, 'Should return error for invalid type');
    });

    it('should handle alloc with invalid type', () => {
      const device = new HardwareDeviceContext();

      try {
        device.alloc(999 as any);
        // Might succeed or throw depending on implementation
        device.free();
      } catch (error) {
        assert.ok(error, 'Should throw or handle invalid type');
      }
    });

    it('should handle operations on uninitialized context', () => {
      const device = new HardwareDeviceContext();

      // Try to get type without initialization - might be undefined
      const type = device.type;
      assert.ok(type === undefined || typeof type === 'number', 'Should return undefined or number when uninitialized');

      // Try to free uninitialized - should not crash
      device.free();
      assert.ok(true, 'Should handle free on uninitialized context');
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple allocations', () => {
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        // First allocation
        device.alloc(types[0]);
        device.free();

        // Second allocation
        device.alloc(types[0]);
        device.free();

        assert.ok(true, 'Should handle multiple allocations');
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle rapid creation and destruction', () => {
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        for (let i = 0; i < 5; i++) {
          const device = new HardwareDeviceContext();
          const ret = device.create(types[0], null, null);

          if (ret === 0) {
            device.free();
          }
        }

        assert.ok(true, 'Should handle rapid creation/destruction');
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });
});
