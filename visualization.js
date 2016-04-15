var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    padding = 3,
    maxRadius = 40;

function getValue(crimeId, d) {
  var crimes = d.crimes[crimeId],
      population = d.population;
  if (!population) {
    return NaN;
  }
  return crimes / population;
}

var projection = d3.geo.albersUsa();

var force = d3.layout.force()
    .charge(0)
    .gravity(0)
    .size([width, height]);

var svg = d3.select('#container').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + [margin.left, margin.top] + ')');

function update(states, crimeId, label) {

  document.querySelector('#crime-class').innerHTML = label;
  Array.prototype.forEach.call(document.querySelectorAll('.buttons button'), function(b) {
    b.className = '';
  });
  document.querySelector('#' + crimeId).className = 'selected';

  var nodes = states
      .map(function(d) {
        var point = projection(d.coordinates),
            value = getValue(crimeId, d),
            radius = d3.scale.sqrt()
              .domain([0, d3.max(states, getValue.bind(null, crimeId))])
              .range([0, maxRadius]);
        return {
          x: point[0], y: point[1],
          x0: point[0], y0: point[1],
          r: radius(value),
          value: value,
          name: d.code
        };
      })
      .filter(function(d) {
        return !isNaN(d.value);
      });

  force
    .nodes(nodes)
    .on('tick', tick)
    .start();

  var node = svg.selectAll('g')
      .data(nodes);

  var nodeEnter = node
    .enter().append('g');

  var circles = nodeEnter.append('circle')
      .attr({
        cx: 0,
        cy: 0
      });

  var labels = nodeEnter.append('text')
      .text(function(d) {
        return d.name;
      })
      .attr({
        'alignment-baseline': 'middle',
        'text-anchor': 'middle'
      });

  // Update
  node
    .select('circle')
    .attr({
      r: function(d) {
        return d.r;
      }
    });

  function tick(e) {
    node.each(gravity(e.alpha * .1))
        .each(collide(.5))
        .attr('transform', function(d) {
          return 'translate(' + [d.x, d.y] + ')';
        });
  }

  function gravity(k) {
    return function(d) {
      d.x += (d.x0 - d.x) * k;
      d.y += (d.y0 - d.y) * k;
    };
  }

  function collide(k) {
    var q = d3.geom.quadtree(nodes);
    return function(node) {
      var nr = node.r + padding,
          nx1 = node.x - nr,
          nx2 = node.x + nr,
          ny1 = node.y - nr,
          ny2 = node.y + nr;
      q.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
          var x = node.x - quad.point.x,
              y = node.y - quad.point.y,
              l = x * x + y * y,
              r = nr + quad.point.r;
          if (l < r * r) {
            l = ((l = Math.sqrt(l)) - r) / l * k;
            node.x -= x *= l;
            node.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
  }
}

d3.json('us_crime_data.json', function(error, states) {
  if (error) throw error;

  d3.json('crime_labels.json', function(error, labels) {
    if (error) throw error;

    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttons';
    document.querySelector('#container').appendChild(buttonContainer);

    labels.forEach(function(l) {
      var btn = document.createElement('button');
      btn.id = l.id;
      btn.innerHTML = l.label;
      btn.onclick = update.bind(null, states, l.id, l.label);
      buttonContainer.appendChild(btn);
    });

    update(states, labels[0].id, labels[0].label);
  });
});
