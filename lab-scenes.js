/* lab-scenes.js — <lab-scene kind="plc|robot|server|cnc|bench|printer"> procedural Three.js viewer */
(function () {
  if (customElements.get('lab-scene')) return;
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
  let threeP = null;
  const loadThree = () => (threeP ||= import(THREE_URL));
  const rad = (d) => (d * Math.PI) / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- model builders ---------- */
  function makeKit(T, g) {
    const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.18 }, o || {}));
    const box = (w, h, d, m, x, y, z, parent) => {
      const ms = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      ms.position.set(x || 0, y || 0, z || 0); ms.castShadow = true; ms.receiveShadow = true;
      (parent || g).add(ms); return ms;
    };
    const cyl = (r, h, m, x, y, z, parent, seg) => {
      const ms = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 28), m);
      ms.position.set(x || 0, y || 0, z || 0); ms.castShadow = true; ms.receiveShadow = true;
      (parent || g).add(ms); return ms;
    };
    const leds = [];
    const led = (color, s, x, y, z, parent, period, phase) => {
      const m = new T.MeshStandardMaterial({ color: 0x151515, emissive: color, emissiveIntensity: 0 });
      const ms = new T.Mesh(new T.BoxGeometry(s, s, s * 0.5), m);
      ms.position.set(x, y, z); (parent || g).add(ms);
      leds.push({ m, period: period || 1.2, phase: phase || Math.random() * 6 });
      return ms;
    };
    const glow = (w, h, d, color, x, y, z, parent, period) => {
      const m = new T.MeshStandardMaterial({ color: 0x0c1116, emissive: color, emissiveIntensity: 1.2 });
      const ms = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      ms.position.set(x, y, z); (parent || g).add(ms);
      if (period) leds.push({ m, period, phase: Math.random() * 6 });
      return ms;
    };
    const C = { metal: 0xb9c2cb, steel: 0x8f9aa6, dark: 0x2b323b, panel: 0xdde3e8, mid: 0x5d6873, yellow: 0xf2b01e, pcbG: 0x1a6b45, pcbT: 0x0e7c8a, orange: 0xe07b39, blue: 0x2f4b6e, green: 0x35c46a, amber: 0xffb340, red: 0xe25547, mitsRed: 0xc22f26, charcoal: 0x30353d };
    return { mat, box, cyl, led, glow, leds, C };
  }
  let mkKit = null;

  const BUILDERS = {
    /* ============ PLC control panel — Mitsubishi iQ-R / iQ-F / FR-D700 / GOT / OMRON KM-N2 ============ */
    plc(T, g) {
      const k = mkKit(T, g), { mat, box, cyl, led, glow, C } = k;
      box(2.7, 1.9, 0.07, mat(C.panel), 0, 1.05, 0); // backplate
      // ---- iQ-R rack (top-left): red PSU + charcoal modules on base unit
      box(1.56, 0.66, 0.1, mat(0x23272e), -0.5, 1.44, 0.09); // base unit
      box(0.26, 0.6, 0.3, mat(C.mitsRed, { roughness: 0.45 }), -1.12, 1.44, 0.28); // R61P PSU
      box(0.2, 0.05, 0.02, mat(0x1a1414), -1.12, 1.62, 0.435);
      led(C.green, 0.035, -1.12, 1.54, 0.435, g, 2.6);
      // CPU
      box(0.22, 0.6, 0.3, mat(0x2a2f36), -0.88, 1.44, 0.28);
      for (let i = 0; i < 4; i++) led([C.green, C.green, C.amber, C.red][i], 0.03, -0.93 + (i % 2) * 0.09, 1.64 - Math.floor(i / 2) * 0.05, 0.435, g, 0.4 + i * 0.3);
      box(0.14, 0.1, 0.02, mat(0x14181d), -0.88, 1.32, 0.435); // SD/USB bay
      // I/O + network modules
      for (let m = 0; m < 6; m++) {
        const x = -0.66 + m * 0.185;
        box(0.165, 0.6, 0.3, mat(m % 2 ? 0x30353d : 0x363c45), x, 1.44, 0.28);
        for (let r = 0; r < 4; r++) led(r === 3 ? C.amber : C.green, 0.024, x - 0.04 + (r % 2) * 0.055, 1.66 - Math.floor(r / 2) * 0.045, 0.435, g, 0.3 + Math.random());
        box(0.12, 0.2, 0.02, mat(0x22262c), x, 1.28, 0.435); // terminal cover
      }
      // ---- FR-D700 VFD (top-right)
      box(0.52, 0.76, 0.42, mat(0x4a4f57), 0.95, 1.4, 0.24);
      box(0.44, 0.64, 0.03, mat(0x565c65), 0.95, 1.42, 0.46);
      glow(0.24, 0.07, 0.012, 0xff4433, 0.88, 1.66, 0.482, g, 2.2); // red 7-seg Hz readout
      led(C.green, 0.026, 1.06, 0.66 + 1.0, 0.482, g, 0.9);
      cyl(0.055, 0.03, mat(0x2b3038), 0.88, 1.5, 0.485, g, 20).rotation.x = Math.PI / 2; // setting dial
      box(0.06, 0.045, 0.02, mat(0x3aa066), 0.99, 1.52, 0.48); // RUN
      box(0.06, 0.045, 0.02, mat(0xc23b30), 1.07, 1.52, 0.48); // STOP
      for (let i = 0; i < 4; i++) box(0.3, 0.018, 0.02, mat(0x3a4048), 0.95, 1.14 + i * 0.045, 0.47); // vents
      // ---- wire ducts
      box(2.5, 0.15, 0.13, mat(0x9aa4ae), 0, 1.02, 0.1);
      box(2.5, 0.15, 0.13, mat(0x9aa4ae), 0, 0.42, 0.1);
      // ---- lower rail: iQ-F FX5U + OMRON KM-N2 + terminals
      box(2.5, 0.09, 0.09, mat(C.steel, { metalness: 0.6, roughness: 0.35 }), 0, 0.74, 0.07);
      // FX5U
      box(0.56, 0.36, 0.3, mat(0x30353d), -0.98, 0.74, 0.22);
      box(0.5, 0.05, 0.31, mat(0x14181d), -0.98, 0.9, 0.22); // top terminals
      box(0.5, 0.05, 0.31, mat(0x14181d), -0.98, 0.58, 0.22); // bottom terminals
      for (let i = 0; i < 6; i++) led(i === 5 ? C.amber : C.green, 0.022, -1.16 + i * 0.05, 0.79, 0.375, g, 0.35 + Math.random() * 0.8);
      // OMRON KM-N2 energy monitor
      box(0.32, 0.36, 0.26, mat(0xd2d7dc), -0.5, 0.74, 0.2);
      glow(0.22, 0.13, 0.012, 0xcfe8c8, -0.5, 0.78, 0.335, g, 3.4); // LCD kWh
      for (let i = 0; i < 3; i++) box(0.045, 0.03, 0.015, mat(0x3a4048), -0.56 + i * 0.06, 0.64, 0.335);
      led(C.amber, 0.02, -0.63, 0.88, 0.335, g, 1.6);
      // terminal blocks
      for (let i = 0; i < 8; i++) box(0.075, 0.2, 0.2, mat(i < 2 ? C.orange : 0xd8dde2), -0.18 + i * 0.115, 0.74, 0.17);
      // ---- GOT2000 HMI (lower-right)
      box(0.66, 0.5, 0.07, mat(0x14171c), 0.98, 0.76, 0.2);
      glow(0.56, 0.4, 0.012, 0x274b66, 0.98, 0.76, 0.245, g, 5.0); // screen
      box(0.1, 0.07, 0.01, mat(0x3aa066), 0.78, 0.9, 0.255); // gauge tiles on screen
      box(0.1, 0.07, 0.01, mat(0xc7a13c), 0.9, 0.9, 0.255);
      box(0.1, 0.07, 0.01, mat(0x9a3d33), 1.02, 0.9, 0.255);
      box(0.34, 0.05, 0.01, mat(0x35526b), 0.92, 0.66, 0.255);
      // wires
      const wm = [mat(0xd4472f), mat(0x2f6fd4), mat(0xe8e8e8)];
      for (let i = 0; i < 9; i++) { const w = cyl(0.012, 0.32, wm[i % 3], -0.85 + i * 0.19, 1.22, 0.2); w.castShadow = false; }
      return {
        cam: { radius: 3.3, theta: 0.45, phi: 1.2, ty: 1.1 },
        hotspots: [
          { p: [-0.88, 1.66, 0.5], t: 'Mitsubishi iQ-R', b: 'Rack-based PLC — live data gathering over SLMP & MC Protocol for plant-wide dashboards. Ladder in GX Works; OMRON in CX-Programmer.' },
          { p: [-0.98, 0.86, 0.42], t: 'Mitsubishi iQ-F (FX5U)', b: 'Compact PLC for cell-level control — I/O over Modbus and Ethernet/IP, integrated with drives and sensors.' },
          { p: [0.95, 1.62, 0.55], t: 'FR-D700 inverter (VFD)', b: 'Inverter comms for conveyor speed & direction control — deployed on the forge line to smooth operator workflow.' },
          { p: [-0.5, 0.82, 0.42], t: 'OMRON KM-N2 energy monitor', b: 'CT-based energy monitoring feeding the IoT dashboard — how ¥4,200/month of standby power was found and cut.' },
          { p: [0.98, 0.8, 0.32], t: 'GOT2000 HMI', b: 'HMI / SCADA screen design for operators — line status, setpoints and alarms.' },
        ],
        tick() {},
      };
    },

    /* ============ 6-axis robot automation cell: conveyor + IAI RoboCylinder ============ */
    robot(T, g) {
      const k = mkKit(T, g), { mat, box, cyl, led, C } = k;
      const Y = mat(C.yellow, { roughness: 0.45 });
      const D = mat(0x30363e, { roughness: 0.5 });
      cyl(0.5, 0.2, mat(0x39414b), 0, 0.1, 0); // pedestal
      const J = [];
      const j1 = new T.Group(); j1.position.y = 0.2; g.add(j1); J.push(j1);
      cyl(0.38, 0.42, Y, 0, 0.21, 0, j1);
      const j2 = new T.Group(); j2.position.set(0.16, 0.52, 0); j1.add(j2); J.push(j2);
      box(0.3, 0.44, 0.46, Y, -0.16, 0.05, 0, j2);
      cyl(0.17, 0.14, D, 0, 0, 0.27, j2).rotation.x = Math.PI / 2;
      box(0.26, 1.05, 0.3, Y, 0, 0.5, 0, j2);
      const j3 = new T.Group(); j3.position.set(0, 1.02, 0); j2.add(j3); J.push(j3);
      box(0.3, 0.32, 0.42, Y, 0, 0.02, 0, j3);
      cyl(0.15, 0.12, D, 0, 0.02, 0.25, j3).rotation.x = Math.PI / 2;
      const j4 = new T.Group(); j4.position.set(0, 0.14, 0); j3.add(j4); J.push(j4);
      box(0.2, 0.72, 0.24, mat(0xe7c766, { roughness: 0.45 }), 0, 0.38, 0, j4);
      const j5 = new T.Group(); j5.position.set(0, 0.76, 0); j4.add(j5); J.push(j5);
      box(0.18, 0.2, 0.28, D, 0, 0.04, 0, j5);
      const j6 = new T.Group(); j6.position.set(0, 0.18, 0); j5.add(j6); J.push(j6);
      cyl(0.09, 0.08, mat(C.steel, { metalness: 0.6 }), 0, 0.02, 0, j6);
      box(0.16, 0.06, 0.16, D, 0, 0.09, 0, j6);
      const f1 = box(0.03, 0.16, 0.05, D, -0.06, 0.2, 0, j6);
      const f2 = box(0.03, 0.16, 0.05, D, 0.06, 0.2, 0, j6);
      // ---- conveyor (front) with moving forged rings
      const beltY = 0.53;
      [-0.95, 0.95].forEach((x) => { box(0.07, beltY - 0.03, 0.07, mat(0x4a525c), x, (beltY - 0.03) / 2, 0.62); box(0.07, beltY - 0.03, 0.07, mat(0x4a525c), x, (beltY - 0.03) / 2, 0.94); });
      box(2.35, 0.07, 0.36, mat(0x39414b), 0, beltY, 0.78);
      box(2.3, 0.03, 0.28, mat(0x22262c, { roughness: 0.7 }), 0, beltY + 0.05, 0.78); // belt
      box(2.35, 0.03, 0.03, mat(C.steel, { metalness: 0.6 }), 0, beltY + 0.09, 0.6); // side rails
      box(2.35, 0.03, 0.03, mat(C.steel, { metalness: 0.6 }), 0, beltY + 0.09, 0.96);
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const grp = new T.Group(); grp.position.set(-1 + i * 0.8, beltY + 0.095, 0.78); g.add(grp);
        cyl(0.09, 0.05, mat(0x9aa4ae, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, grp);
        cyl(0.04, 0.055, mat(0x30363e), 0, 0, 0, grp);
        rings.push(grp);
      }
      // ---- IAI RoboCylinder linear axis (rear, like the reference: rail + slider + motor + controller)
      const rcY = 0.62, rcZ = -0.82;
      [0.06, 1.12].forEach((x) => box(0.12, rcY - 0.07, 0.14, mat(0x4a525c), x, (rcY - 0.07) / 2, rcZ));
      box(1.5, 0.14, 0.18, mat(0xc9d0d7, { metalness: 0.55, roughness: 0.35 }), 0.6, rcY, rcZ); // alu body
      box(1.5, 0.02, 0.05, mat(0x8f9aa6, { metalness: 0.6 }), 0.6, rcY + 0.08, rcZ); // rail slot
      const slider = new T.Group(); slider.position.set(0.6, rcY + 0.1, rcZ); g.add(slider);
      box(0.24, 0.06, 0.2, mat(0xdde3e8, { metalness: 0.4, roughness: 0.35 }), 0, 0, 0, slider);
      box(0.16, 0.05, 0.14, mat(0x30363e), 0, 0.05, 0, slider);
      box(0.2, 0.22, 0.22, mat(0x22262c), 1.46, rcY + 0.02, rcZ); // motor
      // RC controller (small standing drive box)
      box(0.14, 0.3, 0.11, mat(0xb9c2cb), 1.75, 0.15, rcZ + 0.25);
      box(0.05, 0.06, 0.02, mat(0x2f8a4d), 1.75, 0.06, rcZ + 0.31); // green terminal
      led(C.green, 0.022, 1.72, 0.24, rcZ + 0.31, g, 0.8);
      // ---- robot controller cabinet
      box(0.5, 0.7, 0.55, mat(0x424a54), -1.15, 0.35, -0.25);
      for (let i = 0; i < 3; i++) led([C.green, C.amber, C.green][i], 0.04, -1.0 + i * 0.09, 0.58, 0.025, g, 0.6 + i * 0.4);
      const axes = ['y', 'z', 'z', 'y', 'z', 'y'];
      const HOME = [0, -26, 52, 0, 50, 0];
      const LIM = [[-165, 165], [-60, 80], [-70, 120], [-180, 180], [-110, 110], [-200, 200]];
      const cur = HOME.slice(), man = HOME.slice();
      let open = 0.5;
      const apply = () => {
        for (let i = 0; i < 6; i++) J[i].rotation[axes[i]] = rad(cur[i] * (axes[i] === 'z' ? -1 : 1));
        f1.position.x = -0.045 - open * 0.045; f2.position.x = 0.045 + open * 0.045;
      };
      apply();
      const api = {
        limits: LIM,
        jog(i, d) { man[i] = clamp(man[i] + d, LIM[i][0], LIM[i][1]); },
        home() { for (let i = 0; i < 6; i++) man[i] = HOME[i]; },
        sync() { for (let i = 0; i < 6; i++) man[i] = cur[i]; },
        read: () => cur.slice(),
      };
      return {
        cam: { radius: 4.6, theta: 0.55, phi: 1.12, ty: 0.95 },
        api,
        hotspots: [
          { p: [0, 1.9, 0.3], t: 'Wrist & end-effector', b: 'Pick-and-place automation with PLC handshaking — integrated over ladder-based sockets with a Mitsubishi PLC.' },
          { p: [0.6, 0.78, -0.82], t: 'IAI RoboCylinder', b: 'Linear actuator axis — slider, motor and controller — integrated with the Mitsubishi PLC via sockets for automated positioning.' },
          { p: [0.7, 0.62, 0.78], t: 'VFD conveyor', b: 'Conveyor speed and direction driven by inverter comms (FR-D700) — smoother, more efficient operator workflow.' },
          { p: [-1.15, 0.62, 0.05], t: 'Robot controller', b: 'Socket comms between controller and PLC; real-time PLC–CCTV integration for robot monitoring.' },
        ],
        tick(t, dt, el) {
          const auto = el.getAttribute('mode') !== 'manual';
          if (auto) {
            const tgt = [46 * Math.sin(t * 0.45), -26 + 16 * Math.sin(t * 0.7), 52 + 22 * Math.sin(t * 0.55 + 1.2), 24 * Math.sin(t * 0.35), 50 + 24 * Math.sin(t * 0.8 + 2), 55 * Math.sin(t * 0.5)];
            for (let i = 0; i < 6; i++) cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 2.2);
            open = 0.5 + 0.5 * Math.sin(t * 1.3);
          } else {
            for (let i = 0; i < 6; i++) cur[i] += (man[i] - cur[i]) * Math.min(1, dt * 6);
            open = 0.85;
          }
          apply();
          slider.position.x = 0.6 + 0.52 * Math.sin(t * 0.7);
          for (const r of rings) { r.position.x += dt * 0.32; if (r.position.x > 1.25) r.position.x = -1.25; }
        },
      };
    },

    /* ============ data center rack + IoT datashare server ============ */
    server(T, g) {
      const k = mkKit(T, g), { mat, box, led, C } = k;
      const H = 2.0, W = 0.78, D2 = 1.0;
      const post = mat(0x262c34);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.06, H, 0.06, post, (sx * (W - 0.06)) / 2, H / 2, (sz * (D2 - 0.06)) / 2)));
      box(W, 0.05, D2, post, 0, H - 0.02, 0); box(W, 0.08, D2, post, 0, 0.04, 0);
      box(0.03, H - 0.2, D2 - 0.1, mat(0x2e3540), -W / 2 + 0.015, H / 2, 0);
      box(0.03, H - 0.2, D2 - 0.1, mat(0x2e3540), W / 2 - 0.015, H / 2, 0);
      // overhead cable tray (like the datacenter aisle photo)
      box(1.9, 0.04, 0.42, mat(0x8f9aa6, { metalness: 0.5, roughness: 0.4 }), 0, 2.3, -0.1);
      box(1.9, 0.1, 0.03, mat(0x8f9aa6, { metalness: 0.5 }), 0, 2.34, -0.3);
      box(1.9, 0.1, 0.03, mat(0x8f9aa6, { metalness: 0.5 }), 0, 2.34, 0.1);
      const trayCols = [0xe0812f, 0x2f6fd4, 0xe8c93c, 0x3aa066];
      trayCols.forEach((c, i) => { const t2 = k.cyl(0.02, 1.85, mat(c), 0, 2.34, -0.24 + i * 0.09); t2.rotation.z = Math.PI / 2; t2.castShadow = false; });
      // switch on top slot
      box(W - 0.16, 0.09, D2 - 0.2, mat(0x1d232b), 0, 1.82, 0.02);
      for (let i = 0; i < 10; i++) led(i % 4 === 3 ? C.amber : C.green, 0.022, -0.24 + i * 0.055, 1.82, 0.43, g, 0.2 + Math.random() * 0.5);
      // 1U servers
      for (let s = 0; s < 5; s++) {
        const y = 1.62 - s * 0.16;
        box(W - 0.16, 0.13, D2 - 0.16, mat(s % 2 ? 0x39414c : 0x424b57, { metalness: 0.35, roughness: 0.45 }), 0, y, s === 2 ? 0.1 : 0.02);
        box(W - 0.2, 0.02, 0.01, mat(0x12161b), 0, y - 0.035, s === 2 ? 0.52 : 0.44);
        led(C.green, 0.026, -0.26, y + 0.025, s === 2 ? 0.525 : 0.445, g, 0.4 + Math.random() * 1.2);
        led(s === 4 ? C.amber : C.green, 0.026, -0.21, y + 0.025, s === 2 ? 0.525 : 0.445, g, 0.3 + Math.random());
      }
      // IoT datashare box PC (navy, like the reference) on a shelf
      box(W - 0.14, 0.03, D2 - 0.14, mat(0x2e3540), 0, 0.86, 0.02); // shelf
      box(0.5, 0.11, 0.55, mat(0x25314a, { roughness: 0.4, metalness: 0.3 }), 0, 0.93, 0.05);
      for (let i = 0; i < 5; i++) box(0.045, 0.035, 0.012, mat(0x11161d), -0.14 + i * 0.07, 0.93, 0.335);
      led(C.green, 0.024, 0.2, 0.93, 0.34, g, 0.7); led(C.amber, 0.024, 0.16, 0.93, 0.34, g, 1.9);
      // 4U storage with disk trays
      box(W - 0.16, 0.34, D2 - 0.16, mat(0x323a45), 0, 0.42, 0.02);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
        box(0.085, 0.12, 0.03, mat(0x1c222a), -0.26 + c * 0.105, 0.49 - r * 0.15, 0.445);
        led(C.green, 0.016, -0.29 + c * 0.105, 0.52 - r * 0.15, 0.455, g, 0.25 + Math.random() * 0.8);
      }
      // colorful patch cable bundles down both sides
      const cm = [mat(0xe0812f), mat(0x2f6fd4), mat(0xe8c93c), mat(0x3aa066), mat(0xd4472f), mat(0x2f9fd4)];
      for (let i = 0; i < 6; i++) {
        const c = k.cyl(0.014, 1.6, cm[i], W / 2 + 0.045 + (i % 3) * 0.033, 1.05, -0.28 + Math.floor(i / 3) * 0.09);
        c.castShadow = false;
      }
      for (let i = 0; i < 4; i++) {
        const c = k.cyl(0.014, 1.4, cm[(i + 2) % 6], -W / 2 - 0.045 - (i % 2) * 0.033, 1.15, -0.2 + Math.floor(i / 2) * 0.09);
        c.castShadow = false;
      }
      return {
        cam: { radius: 3.7, theta: 0.5, phi: 1.15, ty: 1.1 },
        hotspots: [
          { p: [0, 2.32, 0.12], t: 'Capacity install', b: 'Rack & stack, structured cabling and server deployment at a global technology company\u2019s data centers.' },
          { p: [0, 1.82, 0.46], t: 'Core switch', b: 'IP configuration, LAN/WAN troubleshooting, Linux & Windows server setup.' },
          { p: [0.1, 1.3, 0.46], t: 'Compute nodes', b: 'DENSO IoT data servers maintained in a secured server room — disk and memory checks, uptime and stability.' },
          { p: [0, 0.93, 0.38], t: 'IoT datashare server', b: 'Industrial box PC collecting PLC and sensor data — the bridge between the plant floor and PostgreSQL / Oracle / MariaDB.' },
          { p: [-0.3, 0.5, 0.46], t: 'Storage & automation', b: 'Manual inventory automated into automatic inventory; manual allocation into automatic allocation.' },
        ],
        tick() {},
      };
    },

    /* ============ FANUC-based CNC turning center ============ */
    cnc(T, g) {
      const k = mkKit(T, g), { mat, box, cyl, glow, C } = k;
      const blk = mat(0x1a1d22, { roughness: 0.45 });
      const wht = mat(0xe6e8ea, { roughness: 0.5 });
      box(2.2, 0.4, 1.3, mat(0x15171b), 0, 0.2, 0); // plinth
      box(2.2, 0.5, 1.3, wht, 0, 0.65, 0); // white base band
      box(2.2, 1.0, 0.08, blk, 0, 1.4, -0.61); // back
      box(0.08, 1.0, 1.3, blk, -1.06, 1.4, 0); box(0.08, 1.0, 1.3, blk, 1.06, 1.4, 0);
      box(2.2, 0.16, 1.3, blk, 0, 1.95, 0); // top band
      box(0.9, 0.9, 0.06, blk, -0.55, 1.38, 0.62); // door frame
      const glass = box(0.62, 0.66, 0.05, new T.MeshStandardMaterial({ color: 0x2a3a44, transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0 }), -0.55, 1.4, 0.66);
      glass.castShadow = false;
      box(0.05, 0.9, 0.07, mat(C.orange), -0.06, 1.38, 0.63); // orange trim
      box(0.05, 0.9, 0.07, mat(C.orange), -1.03, 1.38, 0.63);
      // interior: chuck + spinning part (lathe, spindle along X)
      const chuckG = new T.Group(); chuckG.position.set(-0.68, 1.32, -0.05); g.add(chuckG);
      const ch = cyl(0.17, 0.12, mat(0x8f9aa6, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0, chuckG); ch.rotation.z = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const jaw = box(0.05, 0.08, 0.05, mat(0x30363e), 0.08, 0, 0, chuckG);
        jaw.position.y = 0.1 * Math.cos((i * Math.PI * 2) / 3); jaw.position.z = 0.1 * Math.sin((i * Math.PI * 2) / 3);
      }
      const part = cyl(0.06, 0.42, mat(0xc9d0d7, { metalness: 0.75, roughness: 0.25 }), 0.28, 0, 0, chuckG); part.rotation.z = Math.PI / 2;
      // turret
      const turret = new T.Group(); turret.position.set(0.15, 1.32, 0.08); g.add(turret);
      box(0.28, 0.28, 0.28, mat(0x39414b), 0, 0, 0, turret);
      const tool = box(0.18, 0.05, 0.05, mat(0x8f9aa6, { metalness: 0.7 }), -0.2, -0.05, -0.1, turret);
      // FANUC-style control panel (right)
      box(0.6, 0.72, 0.1, mat(0x2a2e35), 0.72, 1.35, 0.58);
      glow(0.3, 0.24, 0.012, 0x8fd8a8, 0.6, 1.5, 0.635, g, 6.0); // green CRT
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) box(0.035, 0.028, 0.014, mat(0xc7a83c, { roughness: 0.5 }), 0.47 + c * 0.05, 1.28 - r * 0.045, 0.635); // amber keypad
      const hw = cyl(0.07, 0.03, mat(0x8f9aa6, { metalness: 0.6 }), 0.92, 1.2, 0.635, g, 20); hw.rotation.x = Math.PI / 2; // handwheel
      cyl(0.045, 0.04, mat(0xd4372a), 0.92, 1.05, 0.635, g, 20).rotation.x = Math.PI / 2; // e-stop
      glow(0.16, 0.045, 0.012, 0xff4433, 0.6, 1.66, 0.635, g, 2.8); // position readout
      return {
        cam: { radius: 3.9, theta: 0.42, phi: 1.2, ty: 1.0 },
        hotspots: [
          { p: [-0.68, 1.45, 0.4], t: 'Chuck & workpiece', b: 'Forged rings turned and inspected — the parts my AI vision and eddy-current systems check downstream.' },
          { p: [0.72, 1.52, 0.68], t: 'FANUC-based control', b: 'Shop-floor CNC integration — commissioning through FAT and SAT to client approval.' },
          { p: [0.15, 1.45, 0.35], t: 'Turret & tooling', b: 'Design-to-machine workflow: NX Siemens, SolidWorks, Fusion 360, AutoCAD.' },
        ],
        tick(t) { chuckG.rotation.x = t * 14; turret.position.x = 0.15 + 0.18 * Math.sin(t * 0.8); },
      };
    },

    /* ============ embedded / IoT bench ============ */
    bench(T, g) {
      const k = mkKit(T, g), { mat, box, cyl, led, C } = k;
      box(2.4, 0.06, 1.5, mat(0x323a45), 0, 0.03, 0);
      const chip = mat(0x14181d);
      const gold = mat(0xd8b24a, { metalness: 0.8, roughness: 0.3 });
      const pi = box(0.5, 0.03, 0.34, mat(C.pcbG), -0.62, 0.075, -0.25);
      box(0.14, 0.05, 0.14, chip, -0.66, 0.11, -0.26);
      box(0.4, 0.035, 0.035, gold, -0.62, 0.1, -0.41);
      box(0.09, 0.06, 0.1, mat(0xb9c2cb, { metalness: 0.7 }), -0.4, 0.11, -0.2);
      box(0.09, 0.06, 0.1, mat(0xb9c2cb, { metalness: 0.7 }), -0.4, 0.11, -0.33);
      led(C.green, 0.025, -0.84, 0.1, -0.15, g, 0.5); led(C.red, 0.025, -0.84, 0.1, -0.11, g, 2.8);
      box(0.42, 0.03, 0.3, mat(C.pcbT), 0.05, 0.075, -0.32);
      box(0.16, 0.045, 0.06, chip, 0.05, 0.1, -0.3);
      box(0.3, 0.03, 0.03, gold, 0.05, 0.095, -0.44); box(0.24, 0.03, 0.03, gold, 0.03, 0.095, -0.2);
      led(C.amber, 0.024, 0.22, 0.1, -0.38, g, 0.8);
      box(0.26, 0.025, 0.18, mat(0x1c2430), 0.62, 0.07, -0.3);
      box(0.12, 0.04, 0.1, mat(0x9aa4ae, { metalness: 0.75, roughness: 0.25 }), 0.6, 0.09, -0.3);
      led(0x4c9ee8, 0.02, 0.72, 0.085, -0.34, g, 0.4);
      box(0.34, 0.03, 0.26, mat(C.pcbG), 1.15, 0.075, -0.25);
      for (let i = 0; i < 5; i++) box(0.26, 0.07, 0.024, mat(0x39414b), 1.15, 0.13, -0.32 + i * 0.035);
      cyl(0.025, 0.55, mat(0x2b323b), -0.15, 0.3, 0.42);
      const camH = new T.Group(); camH.position.set(-0.15, 0.58, 0.42); g.add(camH);
      box(0.16, 0.12, 0.2, mat(0x22272e), 0, 0, 0, camH);
      const lens = cyl(0.045, 0.1, mat(0x0e1216), 0, 0, 0.14, camH, 20); lens.rotation.x = Math.PI / 2;
      led(C.red, 0.022, 0.06, 0.045, 0.11, camH, 1.0);
      camH.rotation.x = 0.5; camH.rotation.y = -0.35;
      cyl(0.09, 0.06, mat(0x4a525c), 0.28, 0.06, 0.5);
      cyl(0.1, 0.06, mat(0xb9c2cb, { metalness: 0.7, roughness: 0.3 }), 0.28, 0.12, 0.5);
      box(0.36, 0.045, 0.24, mat(0xe8ecef), -1.0, 0.085, 0.35);
      const wm = [mat(0xd4472f), mat(0x2f6fd4), mat(0xe0a13c), mat(0x35c46a)];
      for (let i = 0; i < 4; i++) { const w = cyl(0.009, 0.3, wm[i], -0.85 + i * 0.1, 0.12, 0.12); w.rotation.x = 1.2; w.castShadow = false; }
      return {
        cam: { radius: 2.7, theta: 0.35, phi: 0.95, ty: 0.25 },
        hotspots: [
          { p: [-0.62, 0.12, -0.25], t: 'Raspberry Pi', b: 'Python IoT dashboards with PostgreSQL / Oracle / MariaDB backends and real-time visualization.' },
          { p: [1.15, 0.16, -0.25], t: 'Jetson Nano', b: 'Edge AI inference for material inspection — object detection, segmentation, anomaly detection.' },
          { p: [-0.15, 0.62, 0.5], t: 'Inspection camera', b: 'Camera + embedded integration for AI-based QA; custom misalignment-checking system.' },
          { p: [0.62, 0.1, -0.3], t: 'ESP32 / Arduino', b: 'Sensor nodes and actuators feeding CT & production data into the plant network.' },
        ],
        tick(t) { camH.rotation.y = -0.35 + 0.12 * Math.sin(t * 0.6); },
      };
    },

    /* ============ 3D printer ============ */
    printer(T, g) {
      const k = mkKit(T, g), { mat, box, cyl, led, C } = k;
      const ext = mat(0x22262c);
      box(1.0, 0.1, 0.9, ext, 0, 0.05, 0);
      [-1, 1].forEach((s) => { box(0.06, 1.0, 0.06, ext, s * 0.46, 0.6, -0.3); });
      box(1.0, 0.06, 0.06, ext, 0, 1.12, -0.3);
      const screw1 = cyl(0.016, 0.95, mat(0x9aa4ae, { metalness: 0.8, roughness: 0.25 }), -0.38, 0.6, -0.3, g, 10);
      const screw2 = cyl(0.016, 0.95, mat(0x9aa4ae, { metalness: 0.8, roughness: 0.25 }), 0.38, 0.6, -0.3, g, 10);
      box(0.66, 0.035, 0.6, mat(0x2b323b), 0, 0.16, 0.05);
      box(0.62, 0.012, 0.56, mat(0x11151a, { roughness: 0.3, metalness: 0.2 }), 0, 0.185, 0.05);
      const gant = new T.Group(); gant.position.y = 0.62; g.add(gant);
      box(0.98, 0.07, 0.07, mat(0x30363e), 0, 0, -0.3, gant);
      const carr = new T.Group(); carr.position.set(0, 0, -0.3); gant.add(carr);
      box(0.14, 0.16, 0.12, mat(0x39424d), 0, 0, 0.02, carr);
      box(0.05, 0.1, 0.05, mat(0xc7ced6), 0, -0.12, 0.06, carr);
      cyl(0.012, 0.06, mat(0xd8b24a, { metalness: 0.8 }), 0, -0.2, 0.06, carr, 10);
      led(C.red, 0.024, 0.06, 0.02, 0.09, carr, 1.4);
      const spool = new T.Group(); spool.position.set(0.62, 1.12, -0.3); g.add(spool);
      const sc1 = cyl(0.14, 0.03, mat(0x39424d), 0, 0, 0.03, spool); sc1.rotation.x = Math.PI / 2;
      const sc2 = cyl(0.14, 0.03, mat(0x39424d), 0, 0, -0.03, spool); sc2.rotation.x = Math.PI / 2;
      const fil = cyl(0.11, 0.05, mat(0x3fa9d0), 0, 0, 0, spool); fil.rotation.x = Math.PI / 2;
      const partM = mat(0x3fa9d0, { roughness: 0.6 });
      const part = box(0.2, 0.01, 0.2, partM, 0, 0.2, 0.05);
      box(0.3, 0.16, 0.05, mat(0x30363e), 0.3, 0.16, 0.48);
      const scr = new T.MeshStandardMaterial({ color: 0x0c1116, emissive: 0x3fd0e8, emissiveIntensity: 0.8 });
      const scrM = new T.Mesh(new T.BoxGeometry(0.22, 0.09, 0.012), scr); scrM.position.set(0.3, 0.17, 0.51); g.add(scrM);
      k.leds.push({ m: scr, period: 4, phase: 1 });
      return {
        cam: { radius: 2.5, theta: 0.5, phi: 1.1, ty: 0.55 },
        hotspots: [
          { p: [0, 0.55, 0], t: 'Print head', b: 'Rapid prototyping of jigs, camera mounts and sensor housings for the production floor.' },
          { p: [0.3, 0.2, 0.52], t: 'Controller', b: 'Modeled in Fusion 360 & SolidWorks; iterated straight from CAD to the line.' },
        ],
        tick(t) {
          const c = (t * 0.35) % 1;
          gant.position.y = 0.28 + c * 0.55;
          carr.position.x = 0.36 * Math.sin(t * 2.2);
          part.scale.y = 1 + c * 34; part.position.y = 0.195 + (c * 34 * 0.01) / 2;
          screw1.rotation.y = t * 6; screw2.rotation.y = t * 6;
          spool.rotation.z = t * 0.5;
        },
      };
    },
  };

  /* ---------- element ---------- */
  class LabScene extends HTMLElement {
    static get observedAttributes() { return ['kind', 'mode']; }
    connectedCallback() {
      if (this._dom) return;
      this._dom = true;
      this.style.display = 'block'; this.style.position = 'relative'; this.style.overflow = 'hidden';
      this.style.width = '100%'; this.style.height = '100%';
      this._msg = document.createElement('div');
      this._msg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:11px "IBM Plex Mono",monospace;letter-spacing:.08em;color:var(--muted,#888);';
      this._msg.textContent = 'LOADING 3D \u2026';
      this.appendChild(this._msg);
      this._hs = document.createElement('div');
      this._hs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;';
      loadThree().then((m) => this._init(m.default || m)).catch(() => { this._msg.textContent = '3D UNAVAILABLE'; });
    }
    attributeChangedCallback(name) {
      if (name === 'kind' && this._T) this._build();
      if (name === 'mode' && this._model && this._model.api) this._model.api.sync();
    }
    _init(T) {
      if (this._T) return;
      this._T = T;
      let renderer;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
      catch (e) { this._msg.textContent = '3D UNAVAILABLE'; return; }
      this._msg.remove();
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;';
      this.appendChild(renderer.domElement);
      this.appendChild(this._hs);
      this._r = renderer;
      this._scene = new T.Scene();
      this._cam = new T.PerspectiveCamera(38, 1, 0.1, 60);
      const hemi = new T.HemisphereLight(0xffffff, 0x55606c, 1.15); this._scene.add(hemi);
      const dir = new T.DirectionalLight(0xffffff, 1.9); dir.position.set(3.2, 6, 4);
      dir.castShadow = true; dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.left = dir.shadow.camera.bottom = -3.2; dir.shadow.camera.right = dir.shadow.camera.top = 3.2;
      this._scene.add(dir);
      const fill = new T.DirectionalLight(0xcfe4ff, 0.5); fill.position.set(-4, 3, -3); this._scene.add(fill);
      const ground = new T.Mesh(new T.PlaneGeometry(24, 24), new T.ShadowMaterial({ opacity: 0.16 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this._scene.add(ground);
      this._orbit = { theta: 0.5, phi: 1.15, radius: 3.2, ty: 1.0, lastUser: -1e9 };
      const el = renderer.domElement;
      let px = 0, py = 0, drag = false;
      el.addEventListener('pointerdown', (e) => { drag = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; this._closeTip(); });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return;
        this._orbit.theta -= (e.clientX - px) * 0.0062;
        this._orbit.phi = clamp(this._orbit.phi - (e.clientY - py) * 0.0062, 0.3, 1.45);
        px = e.clientX; py = e.clientY;
        this._orbit.lastUser = performance.now();
      });
      const up = () => { drag = false; el.style.cursor = 'grab'; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      this._vis = true;
      this._io = new IntersectionObserver((en) => { this._vis = en[0].isIntersecting; });
      this._io.observe(this);
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);
      this._resize();
      this._build();
      this._t0 = performance.now(); this._last = this._t0; this._lastEvt = 0;
      const loop = (now) => {
        this._raf = requestAnimationFrame(loop);
        if (!this._vis || !this._w) return;
        const t = (now - this._t0) / 1000, dt = Math.min(0.05, (now - this._last) / 1000);
        this._last = now;
        const o = this._orbit;
        const autoOK = this.getAttribute('auto') !== '0' && now - o.lastUser > 5000;
        if (autoOK) o.theta += dt * 0.1;
        const tgt = new T.Vector3(0, o.ty, 0);
        this._cam.position.set(tgt.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta), tgt.y + o.radius * Math.cos(o.phi), tgt.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta));
        this._cam.lookAt(tgt);
        const M = this._model;
        if (M) {
          if (M.tick) M.tick(t, dt, this);
          for (const L of M.leds) L.m.emissiveIntensity = ((t + L.phase) % L.period) / L.period < 0.6 ? 1.8 : 0.12;
          this._placeDots();
          if (M.api && now - this._lastEvt > 120) {
            this._lastEvt = now;
            this.dispatchEvent(new CustomEvent('labscene-joints', { bubbles: true, composed: true, detail: { joints: M.api.read() } }));
          }
        }
        renderer.render(this._scene, this._cam);
      };
      this._raf = requestAnimationFrame(loop);
    }
    _resize() {
      const w = this.clientWidth, h = this.clientHeight;
      this._w = w; this._h = h;
      if (!w || !h || !this._r) return;
      this._r.setSize(w, h, false);
      this._cam.aspect = w / h; this._cam.updateProjectionMatrix();
    }
    _build() {
      const T = this._T;
      if (this._model) {
        this._scene.remove(this._model.group);
        this._model.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
      }
      this._closeTip();
      this._hs.innerHTML = '';
      const kind = this.getAttribute('kind') || 'plc';
      const g = new T.Group();
      const kit = makeKit(T, g);
      mkKit = () => kit;
      const b = (BUILDERS[kind] || BUILDERS.plc)(T, g);
      b.group = g; b.leds = kit.leds;
      this._scene.add(g);
      Object.assign(this._orbit, { theta: b.cam.theta, phi: b.cam.phi, radius: b.cam.radius, ty: b.cam.ty });
      this._model = b;
      this.robot = b.api || null;
      this._dots = (b.hotspots || []).map((h, i) => {
        const d = document.createElement('button');
        d.textContent = i + 1;
        d.style.cssText = 'position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:1.5px solid var(--accent,#22a);background:var(--panel,#fff);color:var(--accent,#22a);font:600 10px "IBM Plex Mono",monospace;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.22);transition:transform .15s;';
        d.addEventListener('pointerdown', (e) => e.stopPropagation());
        d.addEventListener('click', (e) => { e.stopPropagation(); this._openTip(h, d); });
        this._hs.appendChild(d);
        return { d, h };
      });
    }
    _placeDots() {
      if (!this._dots) return;
      const v = new this._T.Vector3();
      for (const { d, h } of this._dots) {
        v.set(h.p[0], h.p[1], h.p[2]).project(this._cam);
        if (v.z > 1) { d.style.display = 'none'; continue; }
        d.style.display = 'flex';
        d.style.left = ((v.x * 0.5 + 0.5) * this._w) + 'px';
        d.style.top = ((-v.y * 0.5 + 0.5) * this._h) + 'px';
      }
    }
    _openTip(h, dot) {
      if (this._tip && this._tip._h === h) { this._closeTip(); return; }
      this._closeTip();
      const tip = document.createElement('div');
      tip._h = h;
      tip.style.cssText = 'position:absolute;z-index:5;max-width:240px;background:var(--panel,#fff);border:1px solid var(--line,#ddd);border-radius:10px;padding:10px 12px;font-family:"Space Grotesk","Noto Sans JP",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.22);pointer-events:auto;';
      tip.innerHTML = '<div style="font:600 12px/1.3 \'Space Grotesk\',\'Noto Sans JP\',sans-serif;color:var(--ink,#111);margin-bottom:4px"></div><div style="font:400 11.5px/1.5 \'Space Grotesk\',\'Noto Sans JP\',sans-serif;color:var(--muted,#777)"></div>';
      tip.children[0].textContent = h.t; tip.children[1].textContent = h.b;
      this._hs.appendChild(tip);
      const dl = parseFloat(dot.style.left), dt2 = parseFloat(dot.style.top);
      tip.style.left = clamp(dl + 16, 8, Math.max(8, this._w - 256)) + 'px';
      tip.style.top = clamp(dt2 + 14, 8, Math.max(8, this._h - tip.offsetHeight - 8)) + 'px';
      this._tip = tip;
    }
    _closeTip() { if (this._tip) { this._tip.remove(); this._tip = null; } }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      if (this._io) this._io.disconnect();
      if (this._ro) this._ro.disconnect();
      if (this._r) { this._r.dispose(); }
      this._dom = false; this._T = null; this._model = null; this._r = null;
      this.innerHTML = '';
    }
  }
  customElements.define('lab-scene', LabScene);
})();
