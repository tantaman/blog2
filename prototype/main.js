const d3Dag = require('d3-dag');
const d3Base = require('d3');
const d3 = {...d3Dag, ...d3Base};

/**
* TODO:
* re-do this with your own custom layout.
* 1. It should take a graph of node and edge lists
* 2. If we find a cycle we should break it (for the layout algo)
* 3. We should topologically sort the graph provided
* 4. Compute the layout based upon this topological sorting w/ broken cycles.
*/

const allData = [
  {
    id: 'Tantamanlands',
  }, {
    id: 'Philosophy',
    parentIds: ['Tantamanlands'],
  }, {
    id: 'Religion',
    parentIds: ['Tantamanlands'],
  }, {
    id: 'Theology',
    parentIds: ['Religion', 'Philosophy'],
  }, {
    id: 'Language',
    parentIds: ['Tantamanlands'],
  }, {
    id: 'Types',
    parentIds: ['Language', 'SoftwareDevelopment'],
  }, {
    id: 'SoftwareDevelopment',
    parentIds: ['Tantamanlands'],
  }, {
    id: 'Programming',
    parentIds: ['SoftwareDevelopment', 'Language'],
  }
];

let data = [{id: 'Tantamanlands'}];

const dataIndex = {};

function addChildren(data, rootId) {
  const have = toMap(data, d => d.id);
  const ret = data.concat(allData.filter(n => have[n.id] == null && (n.parentIds || []).indexOf(rootId) !== -1));
  const n = ret.find(x => x.id === rootId);
  n._open = true;
  return ret;
}

// TODO: Only close nodes that don't have some other parent keeping them open!
// TODO: Highlight as open if no children exist!
// TODO: Close children of node when parent is closed.
function removeChildren(data, rootId, seen) {
  seen = seen || new Set();
  if (seen.has(rootId)) {
    return data;
  }
  seen.add(rootId);

  let ret = data.filter(n => (n.parentIds || []).indexOf(rootId) === -1);
  const n = ret.find(x => x.id === rootId);
  if (n) {
    n._open = false;
  }

  // We removed a node? Recursively remove all its children too!
  const removed = difference(data, ret);
  removed.forEach(e => {
    e._open = false;
    ret = removeChildren(ret, e.id, seen);
  });

  return ret;
}

function first(arr) {
  return arr[0];
}

function last(arr) {
  return arr[arr.length - 1];
}

function toMap(arr, fn) {
  const ret = {};
  arr.forEach(e => ret[fn(e)] = e);
  return ret;
}

function difference(a1, a2) {
  const s2 = new Set(a2);
  return a1.filter(e => !s2.has(e));
}

function htmlToElement(html) {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function makeNav(data) {
  const textFill = '#CCCCCC';
  const textHighlightFill = 'orange';
  const reader = d3.dagStratify();

  const layout = d3.sugiyama()
    .size([window.innerWidth - 60, window.innerHeight - 60])
    .layering(d3.layeringLongestPath())
    .decross(d3.decrossOpt())
    .coord(d3.coordCenter());

  // This code only handles rendering
  const nodeRadius = 20;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const svgNode = htmlToElement(`<svg width=${width} height=${height} viewbox="${-nodeRadius} ${-nodeRadius} ${width + 2 * nodeRadius} ${height + 2 * nodeRadius}"></svg>`)
  document.getElementById('nav').append(svgNode);
  
  const svgSelection = d3.select(svgNode);
  const defs = svgSelection.append('defs');
  defs
    .append('marker')
    .attr("id", "arrow")
    .attr("refX", 6)
    .attr("refY", 6)
    .attr("markerWidth", 30)
    .attr("markerHeight", 30)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 12 6 0 12 3 6")
    .style("fill", "#666666");
  
  const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x(d => d.x)
    .y(d => d.y);
  const interp = d3.interpolateRgb('#666666', '#AAAAAA');

  function constructDag(data) {
    const dag = reader(data);
    layout(dag);
    
    const steps = dag.size();
    const colorMap = {};
    dag.each((node, i) => {
      colorMap[node.id] = interp(i / steps);
    });

    return dag;
  }

  function adjustedLine({ data }) {
    const end = last(data.points);
    const points = data.points.slice(0, data.points.length - 1);
    // TODO: Should technically shift the X as well so we retain
    // the original slop of the line.
    return line(points.concat({x: end.x, y: end.y - 10}));
  }

  function plotEdges(dag) {
    const existing = svgSelection
      .selectAll('.edge')
      .data(dag.links());

    const path = existing
      .enter()
      .append('path')
      .attr('class', 'edge')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke', '#666666')
      .attr('marker-end', 'url(#arrow)')
      .transition()
      .delay(400)
      // TODO: draw the line slowly instead of fading in
      .attr('d', ({ data }) => {
        const [start] = data.points;
        return line([start, start]);
      })
      .transition()
      .duration(750)
      .attr('d', adjustedLine);

    existing
      .transition()
        .duration(750)
        .attr('d', adjustedLine);

    existing.exit().remove();
  }

  function plotNodes(dag) {
    const existing = svgSelection
      .selectAll('.node-label')
      .data(dag.descendants());

    existing
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('transform', ({x, y}) => `translate(${x}, ${y})`)
      .text(d => d.id)
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', d =>  d.data._open ? textHighlightFill : textFill)
      .attr('fill-opacity', 1)
      .attr('stroke', '#000000')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 1)
      .on('mouseover', onTextMouseOver)
      .on('mouseout', onTextMouseOut)
      .on('click', onTextClick);

    existing.exit().remove();

    existing
      .attr('fill', d =>  d.data._open ? textHighlightFill : textFill)
      .transition()
        .duration(750)
        .attr('transform', ({x, y}) => `translate(${x}, ${y})`)
      .text(d => d.id);
  }


  const dag = constructDag(data);
  plotEdges(dag);
  plotNodes(dag);

  function onTextMouseOver() {
    d3.select(this).attr('fill', d =>  d.data._open ? textFill : textHighlightFill);
  }

  function onTextMouseOut() {
    d3.select(this).attr('fill', d => d.data._open ? textHighlightFill : textFill); 
  }

  function onTextClick() {
    const self = d3.select(this).data()[0];
    if (self.data._open) {
      data = removeChildren(data, self.id);
    } else {
      data = addChildren(data, self.id);
    }
    const dag = constructDag(data);
    plotEdges(dag);
    plotNodes(dag);
  }
}

// makeNav(allData);
makeNav(data);