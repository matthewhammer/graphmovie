/*************/
/* init      */
/*************/

//this is the only way I could get the layout the way I wanted it...
var CONTROL_BAR_WIDTH = 250;

//set the change handler
$('#file').change(handleFileSelect);
//set the change handler
$('#list').change(handleListSelect);
var graphinfo = {};
var graph = new joint.dia.Graph;
var paper = new joint.dia.Paper({
    el: $('#paper'),
    width: 200,
    height: 200,
    gridSize: 1,
    model: graph
});
//move the paper out from under the controls
V(paper.viewport).translate(CONTROL_BAR_WIDTH + 2, 2).scale(0.5,0.5);

/***********/
/* Parsing */
/***********/

function makeLink(parentElementLabel, childElementLabel) {

    return new joint.dia.Link({
        source: { id: parentElementLabel },
        target: { id: childElementLabel },
        attrs: { '.marker-target': { d: 'M 4 0 L 0 2 L 4 4 z' } },
        smooth: true
    });
}

function makeElement(label) {

    var maxLineLength = _.max(label.split('\n'), function(l) { return l.length; }).length;

    // Compute width/height of the rectangle based on the number
    // of lines in the label and the letter size. 0.6 * letterSize is
    // an approximation of the monospace font letter width.
    var letterSize = 8;
    var width = 2 * (letterSize * (0.6 * maxLineLength + 1));
    var height = 2 * ((label.split('\n').length + 1) * letterSize);

    return new joint.shapes.basic.Rect({
        id: label,
        size: { width: width, height: height },
        attrs: {
            text: {
                text: label,
                'font-size': letterSize,
                'font-family': 'monospace',
                'transform': ''
            },
            rect: {
                width: width, height: height,
                rx: 5, ry: 5,
                stroke: '#555'
            }
        }
    });
}

// Parses a file, storing all the data into the graphinfo object
// returns an array of graph elements
function parseSimpleAdaptonView(text){
    graphinfo = {
        states: [],
        elements: [],
        links: []
    }
    console.log('spliting on state');
    states = text.split('Graph state: ');
    //first line is the blank before the first state
    states.shift();
    for(i=0;i<states.length;i++){
        console.log('starting parse of state '+i);
        graphinfo.states[i] = {
            title: "No name",
            elementStates: [],
            linkStates: [],
            cstates: []
        }
        var state = graphinfo.states[i]; //shortcut
        var changestates = states[i].split('Change state: ');
        //first entry is the main state
        var lines = changestates[0].split('\n');
        state.title = lines.shift();
        for(j=0;j<lines.length;j++){
            tokens = lines[j].split(' ');
            //process line as element
            if(tokens.length == 2){
                ename = tokens[0];
                estate = tokens[1];
                eindex = graphinfo.elements.indexOf(ename);
                if(eindex == -1){
                    graphinfo.elements.push(ename);
                    eindex = graphinfo.elements.length-1;
                }
                state.elementStates[eindex] = estate;
            }//end element parse
            //process line as link
            if(tokens.length == 3){
                //get line data
                fromNode = tokens[0];
                toNode = tokens[1];
                linkState = tokens[2];
                //set up the elements of the link if needed
                fromNodeIndex = graphinfo.elements.indexOf(fromNode);
                toNodeIndex = graphinfo.elements.indexOf(toNode);
                if(fromNodeIndex == -1){
                    graphinfo.elements.push(fromNode)
                    fromNodeIndex = graphinfo.elements.length-1;
                    state.elementStates[fromNodeIndex] = 'active';
                }
                if(toNodeIndex == -1){
                    graphinfo.elements.push(toNode)
                    toNodeIndex = graphinfo.elements.length-1;
                    state.elementStates[toNodeIndex] = 'active';
                }
                if(!state.elementStates[fromNodeIndex]) {
                    state.elementStates[fromNodeIndex] = 'active';
                }
                if(!state.elementStates[toNodeIndex]) {
                    state.elementStates[toNodeIndex] = 'active';
                }
                //set up the link
                linkIndex = graphinfo.links.indexOf(fromNode+' '+toNode);
                if(linkIndex == -1){
                    graphinfo.links.push(fromNode+' '+toNode);
                    linkIndex = graphinfo.links.length-1;
                }
                state.linkStates[linkIndex] = linkState;
            }//end link parse
        }//end main state line parse
        //parse the rest of the change states
        for(j=1;j<changestates.length;j++){
            graphinfo.states[i].cstates[j-1] = {
                title: "No name",
                elementStates: [],
                linkStates: [],
            }
            state = graphinfo.states[i].cstates[j-1]; //shortcut
            lines = changestates[j].split('\n');
            state.title = lines.shift();
            for(k=0;k<lines.length;k++){
                tokens = lines[k].split(' ');
                //process line as element
                if(tokens.length == 2){
                    ename = tokens[0];
                    estate = tokens[1];
                    eindex = graphinfo.elements.indexOf(ename);
                    if(eindex == -1){
                        graphinfo.elements.push(ename);
                        eindex = graphinfo.elements.length-1;
                    }
                    state.elementStates.push({i: eindex,s: estate});
                }//end element parse
                //process line as link
                if(tokens.length == 3){
                    //get line data
                    fromNode = tokens[0];
                    toNode = tokens[1];
                    linkState = tokens[2];
                    //set up the elements of the link if needed
                    fromNodeIndex = graphinfo.elements.indexOf(fromNode);
                    toNodeIndex = graphinfo.elements.indexOf(toNode);
                    //TODO: these missing nodes should probably be activated along with the link creation
                    if(fromNodeIndex == -1){
                        graphinfo.elements.push(fromNode)
                        fromNodeIndex = graphinfo.elements.length-1;
                    }
                    if(toNodeIndex == -1){
                        graphinfo.elements.push(toNode)
                        toNodeIndex = graphinfo.elements.length-1;
                    }
                    //set up the link
                    linkIndex = graphinfo.links.indexOf(fromNode+' '+toNode);
                    if(linkIndex == -1){
                        graphinfo.links.push(fromNode+' '+toNode);
                        linkIndex = graphinfo.links.length-1;
                    }
                    state.linkStates.push({i: linkIndex,s: linkState});
                }//end link parse
            }//end change line parse
        }//end change state parse
    }//end graph state parse
    //clean up data
    for(i=0;i<graphinfo.states.length;i++){
        var state = graphinfo.states[i]; //shortcut
        for(j=0;j<graphinfo.elements.length;j++){
            if(!state.elementStates[j]){
                state.elementStates[j] = 'nonactive';
            }
        }
        for(j=0;j<graphinfo.links.length;j++){
            if(!state.linkStates[j]){
                state.linkStates[j] = 'nonactive';
            }
        }
    }
    //create elements and links
    for(i=0;i<graphinfo.elements.length;i++){
        graphinfo.elements[i] = makeElement(graphinfo.elements[i]);
    }
    for(i=0;i<graphinfo.links.length;i++){
        var tofrom = graphinfo.links[i].split(' ');
        graphinfo.links[i] = makeLink(tofrom[0],tofrom[1]);
    }
    //return list of elements to graph
    return graphinfo.elements.concat(graphinfo.links);
}

/*****************/
/* file handling */
/*****************/
//handler for new file selection
function handleFileSelect(event) {
    $('#list').empty();
    var files = event.target.files;
    var f = files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        console.log('file loaded');
        filecontents = e.target.result;
        //parse data into graphinfo and cells
        console.log('starting parse');
        cells = parseSimpleAdaptonView(filecontents);
        console.log('parse complete');
        //lay out the graph
        console.log('starting graph generation');
        graph.resetCells(cells);
        console.log('generation complete');
        console.log('starting layout');
        var size = joint.layout.DirectedGraph.layout(graph, {
            setLinkVertices: false,
            nodeSep: 5,
            rankDir: "BT"
        });
        paper.setDimensions(CONTROL_BAR_WIDTH + size.width + 100, size.height + 100); //give some extra room for element sizes
        console.log('layout complete')
        //re-map elements to editable view elements for efficiency
        for(i=0;i<graphinfo.elements.length;i++){
            model = graphinfo.elements[i];
            graphinfo.elements[i] = V(paper.findViewByModel(model).el);
        }
        for(i=0;i<graphinfo.links.length;i++){
            model = graphinfo.links[i];
            graphinfo.links[i] = V(paper.findViewByModel(model).el);
        }
        //set first states
        console.log('loading first states');
        graphinfo.currentBState = 0;
        graphinfo.currentCState = -1;
        graphinfo.currentFullState = {
            elementStates: [],
            linkStates: []
        }
        for(i=0;i<graphinfo.elements.length;i++){
            graphinfo.elements[i].addClass(graphinfo.states[0].elementStates[i]);
            graphinfo.currentFullState.elementStates[i] = graphinfo.states[0].elementStates[i];
        }
        for(i=0;i<graphinfo.links.length;i++){
            graphinfo.links[i].addClass(graphinfo.states[0].linkStates[i]);
            graphinfo.currentFullState.linkStates[i] = graphinfo.states[0].linkStates[i];
        }
        //populate list box with states
        for(i=0;i<graphinfo.states.length;i++){
            $('#list').append('<option value="'+i+'c-1">'+graphinfo.states[i].title+'</option>');
            if(graphinfo.states[i].cstates && graphinfo.states[i].cstates.length){
                for(c=0;c<graphinfo.states[i].cstates.length;c++){
                    $('#list').append('<option value="'+i+'c'+c+'">-'+graphinfo.states[i].cstates[c].title+'</option>');
                }
            }
        }
        console.log('ready for user interation');
    }//end file load handler
    console.log('loading file');
    reader.readAsText(f);
}
/********************/
/* listbox handling */
/********************/
function handleListSelect(event){
    var ss = event.target.value.split('c');
    var baseState = parseInt(ss[0]);
    var changeState = parseInt(ss[1]);

    if(baseState == -1 || baseState == NaN) return;
    //shortcuts
    var eso = graphinfo.currentFullState.elementStates;
    var lso = graphinfo.currentFullState.linkStates;
    var esn = graphinfo.states[baseState].elementStates;
    var lsn = graphinfo.states[baseState].linkStates;

    //forward within the same base state
    if(graphinfo.currentBState == baseState && graphinfo.currentCState < changeState){
        //only load the changes
        for(cs=graphinfo.currentCState+1;cs<=changeState;cs++){
            var ecs = graphinfo.states[baseState].cstates[cs].elementStates;
            var lcs = graphinfo.states[baseState].cstates[cs].linkStates;
            for(c=0;c<ecs.length;c++){
                graphinfo.elements[ecs[c].i].removeClass(eso[ecs[c].i]).addClass(ecs[c].s);
                eso[ecs[c].i] = ecs[c].s;                
            }
            for(c=0;c<lcs.length;c++){
                graphinfo.links[lcs[c].i].removeClass(lso[lcs[c].i]).addClass(lcs[c].s);
                lso[lcs[c].i] = lcs[c].s;
            }
        }
    //arbitrary change of states
    }else{
        //change the state of all the stored objects to the base state
        for(i=0;i<graphinfo.elements.length;i++){
            if(esn[i] != eso[i]){
                graphinfo.elements[i].removeClass(eso[i]).addClass(esn[i]);
                eso[i] = esn[i];
            }
        }
        for(i=0;i<graphinfo.links.length;i++){
            if(lsn[i] != lso[i]){
                graphinfo.links[i].removeClass(lso[i]).addClass(lsn[i]);
                lso[i]=lsn[i];
            }
        }
        //add all the changes
        for(cs=0;cs<=changeState;cs++){
            var ecs = graphinfo.states[baseState].cstates[cs].elementStates;
            var lcs = graphinfo.states[baseState].cstates[cs].linkStates;
            for(c=0;c<ecs.length;c++){
                graphinfo.elements[ecs[c].i].removeClass(eso[ecs[c].i]).addClass(ecs[c].s);
                eso[ecs[c].i] = ecs[c].s;
            }
            for(c=0;c<lcs.length;c++){
                graphinfo.links[lcs[c].i].removeClass(lso[lcs[c].i]).addClass(lcs[c].s);
                lso[lcs[c].i] = lcs[c].s;
            }
        }    
    }
    //set current state
    graphinfo.currentBState = baseState;
    graphinfo.currentCState = changeState;
}
