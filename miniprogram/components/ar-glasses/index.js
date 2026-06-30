Component({
  properties: {
    productName: {
      type: String,
      value: ""
    },
    modelUrl: {
      type: String,
      value: "https://mmbizwxaminiprogram-1258344707.cos.ap-guangzhou.myqcloud.com/xr-frame/demo/glasses.glb"
    },
    modelScale: {
      type: String,
      value: "1 1 1"
    },
    modelPosition: {
      type: String,
      value: "0 0 0"
    },
    modelRotation: {
      type: String,
      value: "0 0 0"
    }
  },

  data: {
    loaded: false,
    arReady: false,
    faceVisible: false,
    faceVisibleClass: "",
    statusText: "正在启动 3D 试戴"
  },

  methods: {
    handleReady({ detail }) {
      this.scene = detail.value;
      this.scene.event.add("tick", this.handleTick.bind(this));
    },

    handleARReady() {
      this.setData({
        arReady: true,
        statusText: "请把脸移入画面"
      });
    },

    handleAssetsLoaded() {
      this.setData({ loaded: true });
      this.hideReferenceFace();
    },

    handleAssetsProgress({ detail }) {
      const progress = Math.round((detail.value?.progress || 0) * 100);
      if (progress > 0 && progress < 100) {
        this.setData({ statusText: `模型加载 ${progress}%` });
      }
    },

    handleTick() {
      if (!this.scene || !this.data.loaded || !this.data.arReady) {
        return;
      }

      const xrSystem = wx.getXrFrameSystem();
      const trackerEl = this.scene.getElementById("face-tracker");
      if (!trackerEl) {
        return;
      }

      const tracker = trackerEl.getComponent(xrSystem.ARTracker);
      const faceVisible = Boolean(tracker?.arActive);
      if (faceVisible !== this.data.faceVisible) {
        this.setData({
          faceVisible,
          faceVisibleClass: faceVisible ? "active" : "",
          statusText: faceVisible ? "3D 试戴中" : "请把脸放进框内"
        });
      }
    },

    hideReferenceFace() {
      setTimeout(() => {
        if (!this.scene) {
          return;
        }

        const xrSystem = wx.getXrFrameSystem();
        const faceEl = this.scene.getElementById("reference-face");
        if (!faceEl) {
          return;
        }

        const faceGLTF = faceEl.getComponent(xrSystem.GLTF);
        if (!faceGLTF?.meshes) {
          return;
        }

        for (const mesh of faceGLTF.meshes) {
          mesh.material.alphaMode = "BLEND";
          mesh.material.renderQueue = 3000;
          mesh.material.setVector("u_baseColorFactor", xrSystem.Vector4.createFromNumber(1, 1, 1, 0));
        }
      }, 60);
    }
  }
});
