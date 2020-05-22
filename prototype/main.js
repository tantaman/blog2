const d3Dag = require('d3-dag');
const d3Base = require('d3');
const d3 = {...d3Dag, ...d3Base};

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

function addChildren(data, rootId) {
  return data.concat(allData.filter(n => (n.parentIds || []).indexOf(rootId) !== -1));
}

function removeChildren(data, rootId) {
  return data.filter(n => n.parentIds.indexOf(rootId) === -1);
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
    console.log(dag);
    layout(dag);
    
    const steps = dag.size();
    const colorMap = {};
    dag.each((node, i) => {
      colorMap[node.id] = interp(i / steps);
    });

    return dag;
  }

  function plotEdges(dag) {
    svgSelection.append('g')
      .selectAll('path')
      .data(dag.links())
      .enter()
      .append('path')
      .attr('d', ({ data }) => {
        const [start, end] = data.points;
        // Should technically shift the X as well so we retain
        // the original slop of the line.
        return line([start, {x: end.x, y: end.y - 10}]);
      })
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke', '#666666')
      .attr('marker-end', 'url(#arrow)');
  }

  function plotNodes(dag) {
    const existing = svgSelection
      .selectAll('text')
      .data(dag.descendants());

    existing
      .enter()
      .append('text')
      .attr('transform', ({x, y}) => `translate(${x}, ${y})`)
      .text(d => d.id)
      .attr('class', 'node-label')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', textFill)
      .attr('fill-opacity', 1)
      .attr('stroke', '#000000')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 1)
      .on('mouseover', onTextMouseOver)
      .on('mouseout', onTextMouseOut)
      .on('click', onTextClick);

    existing.exit().remove();

    existing.attr('transform', ({x, y}) => `translate(${x}, ${y})`);
  }


  const dag = constructDag(data);
  plotEdges(dag);
  plotNodes(dag);

  function onTextMouseOver() {
    d3.select(this).attr('fill', textHighlightFill);
  }

  function onTextMouseOut() {
    d3.select(this).attr('fill', textFill); 
  }

  function onTextClick() {
    const dag = constructDag(addChildren(data, d3.select(this).data()[0].id));
    plotEdges(dag);
    plotNodes(dag);
  }
}

// makeNav(allData);
makeNav([{id: 'Tantamanlands'}]);