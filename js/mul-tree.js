class MulTree {
  constructor(d = {}) {
    const me = this
    me.d = d

    d.conf = {
      itemHeight: 20,
      lineHeight: 50,
      font: '14px Arial',
      scale: 2,
      translate: {
        x: Number(localStorage.translateX) || 0,
        y: Number(localStorage.translateY) || 0,
      }
    }
    d.gd = d.canvas.getContext('2d')

    me.initData()
    me.setLayout()
    me.initEvents()
  }
  initData() {
    const me = this
    const d = me.d
    const gd = d.gd

    gd.font = d.conf.font
    d.mapId = {}
    d.mapPid = {}
    d.stair = []
    d.root = d.data[0]

    d.data.forEach((v) => {
      v.width = Math.ceil(gd.measureText(v.id).width + 15)
      d.mapId[v.id] = v
      d.mapPid[v.pid] = d.mapPid[v.pid] || []
      d.mapPid[v.pid].push(v)
    })

    const mapVisited = {}
    const circleNodes = []

    while (d.mapId[d.root?.pid]) {
      const node = d.mapId[d.root.pid]
      if (mapVisited[node.id]) {
        throw new Error('数据带环，会导致死循环~  环数据：' + JSON.stringify(circleNodes.map(v => v.id).join('->')))
      }
      mapVisited[node.id] = true
      d.root = node
      circleNodes.push(d.root)
    }

    const setDepth = (node, depth = 0) => {
      node.depth = depth
      !d.stair[depth] && (d.stair[depth] = [])
      node.hIndex = d.stair[depth].length
      d.stair[depth].push(node)

      d.mapPid[node.id]?.forEach((v) => {
        setDepth(v, depth + 1)
      })
    }
    setDepth(d.root)
  }
  getPrev(node) {
    return this.d.stair[node?.depth]?.[node?.hIndex - 1]
  }
  getNext(node) {
    return this.d.stair[node?.depth]?.[node?.hIndex + 1]
  }
  getChildren(node) {
    const result = []
    const loop = (node) => {
      result.push(node)
      this.d.mapPid[node.id]?.forEach(loop)
    }
    loop(node)
    return result
  }
  getDis(node, direction = 'l') {
    const children = this.getChildren(node)
    const set = new Set(children)
    const isL = direction === 'l'
    let dis = Infinity

    children.forEach((v) => {
      const tmp = this[isL ? 'getPrev' : 'getNext'](v)
      if (!tmp || set.has(tmp)) return
      dis = (
        isL ?
          Math.min(dis, v.x - (tmp.x + tmp.width)) :
          Math.min(dis, tmp.x - (v.x + v.width))
      )
    })

    return dis === Infinity ? 0 : dis
  }
  translate(node, x = 0, y = 0) {
    this.getChildren(node).forEach((v) => {
      v.x += x
      v.y += y
    })
  }
  setLayout() {
    const me = this
    const d = me.d

    for (let depth = d.stair.length - 1; depth > -1; depth--) {
      const row = d.stair[depth]

      for (let i = 0; i < row.length; i++) {
        const node = row[i]
        const nodeL = me.getPrev(node)
        const children = d.mapPid[node.id]

        node.y = node.depth * d.conf.lineHeight

        if (!children) {
          node.x = nodeL ? nodeL.x + nodeL.width : 0
          continue
        }

        for (let j = children.length - 2; j > -1; j--) {
          const tmp = children[j]
          const dis = me.getDis(tmp, 'r')
          dis !== 0 && me.translate(tmp, dis)
        }

        const l = children[0]
        const r = children[children.length - 1]

        node.x = (l.x + r.x + r.width) / 2 - node.width / 2
        const dis = me.getDis(node)
        dis !== 0 && me.translate(node, -dis)

        let leafs = []

        for (let j = 0; j < children.length; j++) {
          const tmp = children[j]

          if (d.mapPid[tmp.id]) {
            if (leafs.length === 0) continue

            const l = me.getPrev(leafs[0])
            const r = me.getNext(leafs[leafs.length - 1])

            if (
              l && l.pid === node.id &&
              r && r.pid === node.id
            ) {
              const space = (r.x - l.x - l.width - leafs.reduce((total, item) => {
                return total += item.width
              }, 0)) / (leafs.length + 1)

              leafs.forEach((v) => {
                const nodeL = me.getPrev(v)
                v.x = nodeL.x + nodeL.width + space
              })
            }

            leafs = []
          } else {
            leafs.push(tmp)
          }
        }
      }
    }
  }
  initEvents() {
    const me = this
    const d = me.d
    const canvas = d.canvas

    window.onresize = () => {
      const w = d.w = canvas.offsetWidth
      const h = d.h = canvas.offsetHeight

      canvas.width = w * d.conf.scale
      canvas.height = h * d.conf.scale

      me.render()
    }
    window.onresize()

    canvas.onmousedown = (e) => {
      const x1 = e.clientX
      const y1 = e.clientY

      const originX = d.conf.translate.x
      const originY = d.conf.translate.y

      document.onmousemove = (e) => {
        const x2 = e.clientX
        const y2 = e.clientY

        localStorage.translateX = d.conf.translate.x = x2 - x1 + originX
        localStorage.translateY = d.conf.translate.y = y2 - y1 + originY

        me.render()
      }
      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
      }
    }
  }
  render() {
    const me = this
    const d = me.d
    const gd = d.gd

    const renderLine = () => {
      gd.beginPath()
      d.data.forEach((v) => {
        const p = d.mapId[v.pid]
        if (!p) return

        const x1 = p.x + p.width / 2
        const y1 = p.y + d.conf.itemHeight / 2

        const x4 = v.x + v.width / 2
        const y4 = v.y + d.conf.itemHeight / 2

        const x2 = x1
        const y2 = (y1 + y4) / 2

        const x3 = x4
        const y3 = (y1 + y4) / 2

        gd.moveTo(x1, y1)
        gd.bezierCurveTo(
          x2, y2,
          x3, y3,
          x4, y4,
        )
      })

      gd.strokeStyle = 'rgba(128, 128, 128, 1)'
      gd.stroke()
    }

    const renderNode = () => {
      gd.font = d.conf.font
      gd.textAlign = 'center'
      gd.textBaseline = 'middle'
      d.data.forEach((v) => {
        gd.fillStyle = v.fillStyle || d.conf.fillStyle || 'rgba(0,170,255,.5)'
        gd.fillRect(v.x + 1, v.y, v.width - 2, d.conf.itemHeight)

        gd.fillStyle = '#fff'
        gd.fillText(v.id, v.x + v.width / 2, v.y + d.conf.itemHeight / 2)
      })
    }

    gd.clearRect(0, 0, d.w * d.conf.scale, d.h * d.conf.scale)
    gd.save()
    gd.scale(d.conf.scale, d.conf.scale)
    gd.translate(d.conf.translate.x, d.conf.translate.y)
    renderLine()
    renderNode()
    gd.restore()
  }
}

new MulTree({
  canvas: document.getElementById('canvas'),
  data: treeData,
})