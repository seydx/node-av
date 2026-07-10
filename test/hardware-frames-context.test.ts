import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AV_HWFRAME_TRANSFER_DIRECTION_FROM,
  AV_HWFRAME_TRANSFER_DIRECTION_TO,
  AV_PIX_FMT_CUDA,
  AV_PIX_FMT_NV12,
  AV_PIX_FMT_VAAPI,
  AV_PIX_FMT_VIDEOTOOLBOX,
  AV_PIX_FMT_YUV420P,
  Frame,
  HardwareDeviceContext,
  HardwareFramesContext,
} from '../src/index.js';

describe('HardwareFramesContext', () => {
  describe('Creation and Lifecycle', () => {
    it('should create a new HardwareFramesContext', () => {
      const frames = new HardwareFramesContext();
      assert.ok(frames instanceof HardwareFramesContext, 'Should create instance');
    });

    it('should allocate frames context', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);
          // Context is allocated but not initialized
          assert.ok(frames, 'Should allocate context');
          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should free frames context', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);
          frames.free();
          // Context is now freed - no crash should occur
          assert.ok(true, 'Should free without error');
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should support Symbol.dispose', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          if (typeof frames[Symbol.dispose] === 'function') {
            frames[Symbol.dispose]();
          }
          assert.ok(true, 'Should dispose without error');
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle multiple free calls safely', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);
          frames.free();
          frames.free(); // Should not crash
          assert.ok(true, 'Should handle multiple free calls');
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Configuration', () => {
    it('should set and get format', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Set hardware format based on device type
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12; // Generic hardware format
          }

          const format = frames.format;
          assert.equal(typeof format, 'number', 'Should get format');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should set and get software format', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          frames.swFormat = AV_PIX_FMT_YUV420P;
          const swFormat = frames.swFormat;
          assert.equal(swFormat, AV_PIX_FMT_YUV420P, 'Should set/get software format');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should set and get dimensions', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          frames.width = 1920;
          frames.height = 1080;

          assert.equal(frames.width, 1920, 'Should set/get width');
          assert.equal(frames.height, 1080, 'Should set/get height');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should set and get initial pool size', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          frames.initialPoolSize = 10;
          const poolSize = frames.initialPoolSize;
          assert.equal(poolSize, 10, 'Should set/get initial pool size');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Initialization', () => {
    it('should initialize frames context', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure frames context
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 1920;
          frames.height = 1080;

          const initRet = frames.init();
          assert.equal(typeof initRet, 'number', 'Should return status code');
          // Initialization might fail depending on hardware availability
          if (initRet === 0) {
            assert.ok(true, 'Should initialize successfully');
          } else {
            assert.ok(true, 'Initialization failed (hardware not available)');
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should fail initialization without required properties', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Try to initialize without setting properties
          const initRet = frames.init();
          assert.equal(typeof initRet, 'number', 'Should return status code');
          assert.ok(initRet < 0, 'Should fail without configuration');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Frame Operations', () => {
    it('should get buffer from pool', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 640;
          frames.height = 480;
          frames.initialPoolSize = 4;

          const initRet = frames.init();
          if (initRet === 0) {
            const frame = new Frame();
            frame.alloc();

            const getBufferRet = frames.getBuffer(frame);
            assert.equal(typeof getBufferRet, 'number', 'Should return status code');

            if (getBufferRet === 0) {
              assert.equal(frame.width, 640, 'Frame should have correct width');
              assert.equal(frame.height, 480, 'Frame should have correct height');
            }

            frame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('keeps wrapped contexts valid after the owner drops them', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 640;
          frames.height = 480;
          frames.initialPoolSize = 4;

          const initRet = frames.init();
          if (initRet === 0) {
            const frame = new Frame();
            frame.alloc();

            if (frames.getBuffer(frame) === 0) {
              // The wrapper must hold its own reference on the frames context
              // (not borrow the frame's), so it survives frame.unref().
              const held = frame.hwFramesCtx;
              assert.ok(held, 'hardware frame exposes its frames context');

              // Same for the device context wrapped through deviceRef.
              const heldDevice = held.deviceRef;
              assert.ok(heldDevice, 'frames context exposes its device context');

              frame.unref();

              assert.equal(held.width, 640, 'frames wrapper remains valid after the frame released its ref');
              assert.equal(held.height, 480, 'frames wrapper reads the context, not freed memory');
              assert.equal(typeof heldDevice.type, 'number', 'device wrapper remains valid');

              // Freeing the held wrappers drops only their own references.
              held.free();
              heldDevice.free();
              assert.equal(frames.width, 640, 'owner context is unaffected by freeing the wrappers');
            }

            frame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Transfer Operations', () => {
    it('should transfer data to hardware frame (async)', async () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            // Create software frame
            const swFrame = new Frame();
            swFrame.alloc();
            swFrame.format = AV_PIX_FMT_YUV420P;
            swFrame.width = 320;
            swFrame.height = 240;
            swFrame.getBuffer();

            // Create hardware frame
            const hwFrame = new Frame();
            hwFrame.alloc();
            frames.getBuffer(hwFrame);

            // Transfer data (upload to hardware)
            const transferRet = await frames.transferData(hwFrame, swFrame);
            assert.equal(typeof transferRet, 'number', 'Should return status code');

            hwFrame.free();
            swFrame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should transfer data from hardware frame (async)', async () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            // Create hardware frame
            const hwFrame = new Frame();
            hwFrame.alloc();
            frames.getBuffer(hwFrame);

            // Create software frame
            const swFrame = new Frame();
            swFrame.alloc();
            swFrame.format = AV_PIX_FMT_YUV420P;
            swFrame.width = 320;
            swFrame.height = 240;
            swFrame.getBuffer();

            // Transfer data (download from hardware)
            const transferRet = await frames.transferData(swFrame, hwFrame);
            assert.equal(typeof transferRet, 'number', 'Should return status code');

            swFrame.free();
            hwFrame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should transfer data to hardware frame (sync)', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            // Create software frame
            const swFrame = new Frame();
            swFrame.alloc();
            swFrame.format = AV_PIX_FMT_YUV420P;
            swFrame.width = 320;
            swFrame.height = 240;
            swFrame.getBuffer();

            // Create hardware frame
            const hwFrame = new Frame();
            hwFrame.alloc();
            frames.getBuffer(hwFrame);

            // Transfer data (upload to hardware)
            const transferRet = frames.transferDataSync(hwFrame, swFrame);
            assert.equal(typeof transferRet, 'number', 'Should return status code');

            hwFrame.free();
            swFrame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should transfer data from hardware frame (sync)', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            // Create hardware frame
            const hwFrame = new Frame();
            hwFrame.alloc();
            frames.getBuffer(hwFrame);

            // Create software frame
            const swFrame = new Frame();
            swFrame.alloc();
            swFrame.format = AV_PIX_FMT_YUV420P;
            swFrame.width = 320;
            swFrame.height = 240;
            swFrame.getBuffer();

            // Transfer data (download from hardware)
            const transferRet = frames.transferDataSync(swFrame, hwFrame);
            assert.equal(typeof transferRet, 'number', 'Should return status code');

            swFrame.free();
            hwFrame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should get transfer directions', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            const directions = frames.transferGetFormats(AV_HWFRAME_TRANSFER_DIRECTION_FROM);
            assert.ok(Array.isArray(directions), 'Should return array of formats');

            const directions2 = frames.transferGetFormats(AV_HWFRAME_TRANSFER_DIRECTION_TO);
            assert.ok(Array.isArray(directions2), 'Should return array of formats');
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Properties', () => {
    it('should get device reference', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Note: deviceRef might not be accessible from TypeScript
          // This test validates the relationship was established
          assert.ok(frames, 'Frames context allocated with device');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Map Operations', () => {
    it('should attempt to map frame', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            const hwFrame = new Frame();
            hwFrame.alloc();
            frames.getBuffer(hwFrame);

            const dstFrame = new Frame();
            dstFrame.alloc();

            // Try to map (might not be supported for all hardware)
            const mapRet = frames.map(dstFrame, hwFrame, 1); // AV_HWFRAME_MAP_READ
            assert.equal(typeof mapRet, 'number', 'Should return status code');

            dstFrame.free();
            hwFrame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should attempt to map from another device', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Configure and initialize
          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;

          const initRet = frames.init();
          if (initRet === 0) {
            // Create source frame
            const srcFrame = new Frame();
            srcFrame.alloc();
            srcFrame.format = AV_PIX_FMT_YUV420P;
            srcFrame.width = 320;
            srcFrame.height = 240;
            srcFrame.getBuffer();

            const dstFrame = new Frame();
            dstFrame.alloc();

            // Try to map from software to hardware
            // Note: There's no mapFromTo method, using regular map
            const mapRet = frames.map(dstFrame, srcFrame, 0);
            assert.equal(typeof mapRet, 'number', 'Should return status code');

            dstFrame.free();
            srcFrame.free();
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small dimensions', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // Very small size
          frames.width = 16;
          frames.height = 16;
          frames.swFormat = AV_PIX_FMT_YUV420P;

          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }

          const initRet = frames.init();
          // Small sizes might not be supported
          assert.equal(typeof initRet, 'number', 'Should return status code');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle large dimensions', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          // 4K resolution
          frames.width = 3840;
          frames.height = 2160;
          frames.swFormat = AV_PIX_FMT_YUV420P;

          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }

          const initRet = frames.init();
          // Large sizes might fail due to memory constraints
          assert.equal(typeof initRet, 'number', 'Should return status code');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle zero pool size', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          frames.initialPoolSize = 0; // No pre-allocated frames
          frames.width = 640;
          frames.height = 480;
          frames.swFormat = AV_PIX_FMT_YUV420P;

          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }

          const initRet = frames.init();
          assert.equal(typeof initRet, 'number', 'Should return status code');

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle operations on uninitialized context', () => {
      const frames = new HardwareFramesContext();

      // Try to get properties without initialization
      const width = frames.width;
      const height = frames.height;
      const format = frames.format;

      assert.ok(width === undefined || typeof width === 'number', 'Width should be undefined or number');
      assert.ok(height === undefined || typeof height === 'number', 'Height should be undefined or number');
      assert.ok(format === undefined || typeof format === 'number', 'Format should be undefined or number');

      // Try to free uninitialized - should not crash
      frames.free();
      assert.ok(true, 'Should handle free on uninitialized context');
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple allocations', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          // First allocation
          frames.alloc(device);
          frames.free();

          // Second allocation
          frames.alloc(device);
          frames.free();

          assert.ok(true, 'Should handle multiple allocations');
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });

    it('should handle rapid frame allocation', () => {
      const frames = new HardwareFramesContext();
      const device = new HardwareDeviceContext();
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const ret = device.create(types[0], null, null);
        if (ret === 0) {
          frames.alloc(device);

          const typeName = HardwareDeviceContext.getTypeName(types[0]);
          if (typeName === 'videotoolbox') {
            frames.format = AV_PIX_FMT_VIDEOTOOLBOX;
          } else if (typeName === 'cuda') {
            frames.format = AV_PIX_FMT_CUDA;
          } else if (typeName === 'vaapi') {
            frames.format = AV_PIX_FMT_VAAPI;
          } else {
            frames.format = AV_PIX_FMT_NV12;
          }
          frames.swFormat = AV_PIX_FMT_YUV420P;
          frames.width = 320;
          frames.height = 240;
          frames.initialPoolSize = 2;

          const initRet = frames.init();
          if (initRet === 0) {
            // Rapid allocation and deallocation
            for (let i = 0; i < 5; i++) {
              const frame = new Frame();
              frame.alloc();
              const getBufferRet = frames.getBuffer(frame);
              if (getBufferRet === 0) {
                frame.free();
              } else {
                frame.free();
                break;
              }
            }
            assert.ok(true, 'Should handle rapid allocations');
          }

          frames.free();
          device.free();
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });

  describe('Platform-specific Tests', () => {
    it('should use appropriate pixel formats for platform', () => {
      const types = HardwareDeviceContext.iterateTypes();

      if (types.length > 0) {
        const typeName = HardwareDeviceContext.getTypeName(types[0]);
        console.log(`Primary hardware type: ${typeName}`);

        const platform = process.platform;

        if (platform === 'darwin' && typeName === 'videotoolbox') {
          assert.ok(true, 'macOS uses VideoToolbox');
        } else if (platform === 'linux') {
          const validTypes = ['vaapi', 'cuda', 'vdpau', 'opencl', 'vulkan'];
          assert.ok(validTypes.includes(typeName ?? ''), `Linux uses valid hardware type: ${typeName}`);
        } else if (platform === 'win32') {
          const validTypes = ['d3d11va', 'd3d12va', 'dxva2', 'qsv', 'cuda', 'opencl', 'vulkan'];
          assert.ok(validTypes.includes(typeName ?? ''), `Windows uses valid hardware type: ${typeName}`);
        } else {
          assert.ok(true, `Platform ${platform} with hardware type ${typeName}`);
        }
      } else {
        assert.ok(true, 'No hardware acceleration available');
      }
    });
  });
});
