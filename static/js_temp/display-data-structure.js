function displayDataStructure(username, hashkey){
    console.log(username, hashkey);   
    $.getJSON(
        '/getDataStructure',
        {arg: JSON.stringify({"username" : username, "hashkey" : hashkey})},
        function (response){
            var structure = response.elements;
            var parsed_structure = parseStrucutre(structure);
            console.log(parsed_structure);
            drawTree(parsed_structure);
        }
    )
}

function parseStrucutre(structure){
    var parsed_structure = {};
    for (var key in structure){
        var data = structure[key]['data'];
        var children = structure[key]['children'];
        if (Object.keys(children).length == 0){
            parsed_structure['children'] = [];
            parsed_structure['name'] = key;
            parsed_structure['data'] = data;
        }
        else{
            if ('parameter_id' in data){
                parsed_structure['name'] = 'parameter';
            }
            else{
                parsed_structure['name'] = key;
            }
            
            parsed_structure['data'] = data;
            parsed_structure['children'] = [];
            for (var each in children){
                var obj = {};
                obj[each] = children[each];
                parsed_structure['children'].push(parseStrucutre(obj));
            }
        }
    }
    return parsed_structure;
}

function drawTree(parsed_structure) {
    var full_width = $(window).width();
    var full_height = $(window).height();
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = full_width - margin.right - margin.left,
    height = full_height - margin.top - margin.bottom;

    var i = 0,
        duration = 750,
        root;

    var tree = d3.layout.tree()
        .size([height, width]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var svg = d3.select("#main-area").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    root = parsed_structure;
    root.x0 = height / 2;
    root.y0 = 0;

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    root.children.forEach(collapse);
    update(root);

    d3.select(self.frameElement).style("height", "800px");

    function update(source) {

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", click)
            .on("contextmenu", rightClickHandler);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("text")
            .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })
            //.text(function(d) { return d.name + '->' + d.id.toString(); })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            //.style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
            .style("fill", function(d) {
                if (d.id == window.target_node){
                    return "#ca002a";
                }
                else{
                    return d._children ? "lightsteelblue" : "#fff"; 
                }
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
              var o = {x: source.x0, y: source.y0};
              return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
              var o = {x: source.x, y: source.y};
              return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });
    }

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } 
        else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }

}

function rightClickHandler(d){
    $.smartMenu.remove();
    d3.event.preventDefault();
    bindContextMenu();
}

function bindContextMenu() {
    var userMenuData = [
        [
            {
                text: "Set as Target Node",
                func: function() {
                    if (window.target_node != null){
                        var curr_target_node = $.grep($("g.node").toArray(), function(item){
                            return item.__data__.id == window.target_node;
                        })[0];

                        //if target node is not collapsed
                        if(curr_target_node != null){
                            if ('children' in curr_target_node.__data__){
                            //if expanded, fill with white
                                curr_target_node.childNodes[0].style.fill = 'rgb(255,255,255)';
                            }
                            else{
                                //if not expanded, fill with blue
                                curr_target_node.childNodes[0].style.fill = 'rgb(176,196,222)';
                            }
                        }
                    }
                    window.target_node = $(this)[0].__data__.id;
                    $(this)[0].childNodes[0].style.fill = 'rgb(202,0,42)';
                }
            },
            {
                text: "Cancel Target Node",
                func: function() {
                    var node_id = $(this)[0].__data__.id;
                    if (window.target_node == node_id){
                        window.target_node = null;
                        if ('children' in $(this)[0].__data__){
                            //if expanded, fill with white
                            $(this)[0].childNodes[0].style.fill = 'rgb(255,255,255)';
                        }
                        else{
                            //if not expanded, fill with blue
                            $(this)[0].childNodes[0].style.fill = 'rgb(176,196,222)';
                        }
                    }
                }
            },
            {
                text: "View Detail",
                func: function() {
                    var node_data = $(this)[0].__data__.data;
                    window.alert(JSON.stringify(node_data));
                }
            }
        ]
    ];

    $("body").smartMenu(userMenuData, {
        name: "contextMenu",
        container: "g.node"
    });
}