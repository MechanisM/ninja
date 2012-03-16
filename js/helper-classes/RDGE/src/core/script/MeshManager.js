/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

function Model(name, mesh) 
{
    this.name = name;
    this.mesh = mesh;
    this.camera = null;
}

/*
 *	Maintains a list of meshes to allow instancing of data
 */
function MeshManager() {
    this.contentUrl					= "assets_web/mesh/";
    this.modelMap					= {};
    this.readyList					= [];		// meshes that have data ready
    this.meshesLoading				= true;		// indicates that no meshes have loaded or that they are still loading
    this.postMeshLoadCallbackList	= [];
    this.tempSphere					= null;
    this.requestCounter				= 0;
}

/*
 * Pass the scene meshNode stump, loads temp object while real mesh is downloading
 */
MeshManager.prototype.loadMesh = function (meshStump, tempMesh) 
{
    // if it exists already, return the mesh requested
    if ( this.modelMap[meshStump.name] !== undefined )
        return this.modelMap[meshStump.name];

    meshStump.ready = false;
    meshStump.addr = this.contentUrl + meshStump.name + "_mesh.json";
    meshStump.ctxID = g_Engine.getContext().renderer.id;

	// sets a temp mesh up in place of the final mesh to load
    if (!tempMesh) 
    {
        if (this.tempSphere == null) 
        {
            this.tempSphere = makeSphere(g_Engine.getContext().renderer.ctx, 25, 5, 5);
        }

        tempMesh = this.tempSphere;
    }

	// add the temp mesh to the map of loaded meshes
    this.modelMap[meshStump.name] = tempMesh;
    
    // update the request counter - we now have one more mesh to load
    this.requestCounter++;

    requestMesh(meshStump);

    return null;
};

/*
 * Deletes the passed mesh from the manager as well as all renderers
 */
MeshManager.prototype.deleteMesh = function (name) 
{
	var model = this.modelMap[name];
	
	if (model)
	{
		g_Engine.ctxMan.forEach(function(context)
		{
			context.renderer.deletePrimitive(model.primitive);
		});

		delete this.modelMap[name];
	}
};

MeshManager.prototype.getModelByName = function (name) 
{
    return this.modelMap[name];
};

MeshManager.prototype.getModelNames = function () 
{
    var names = [];
    for (var index in this.modelMap) {
        names.push(this.modelList[index].name);
    }

    return names;
};


MeshManager.prototype.processMeshData = function () {
	var renderer = g_Engine.getContext().renderer;
	
    // loop through meshes and load ready data
    for (var index in this.readyList) {
        // if item is ready load it
        if (this.readyList[index] && this.readyList[index].ready && renderer.id === this.readyList[index].ctxID) {
        

            // pop the item
            var model = this.readyList[index];
            this.readyList.splice(index, 1);
            
            var primset = new rdgePrimitiveDefinition();
            
            primset.vertexDefinition = 
            {
				// this shows two ways to map this data to an attribute
				"vert":{'type':rdgeConstants.VS_ELEMENT_POS, 'bufferIndex':0, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"a_pos":{'type':rdgeConstants.VS_ELEMENT_POS, 'bufferIndex':0, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"normal":{'type':rdgeConstants.VS_ELEMENT_FLOAT3, 'bufferIndex':1, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"a_norm":{'type':rdgeConstants.VS_ELEMENT_FLOAT3, 'bufferIndex':1, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"a_normal":{'type':rdgeConstants.VS_ELEMENT_FLOAT3, 'bufferIndex':1, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"texcoord":{'type':rdgeConstants.VS_ELEMENT_FLOAT2, 'bufferIndex':2, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"a_texcoord":{'type':rdgeConstants.VS_ELEMENT_FLOAT2, 'bufferIndex':2, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"a_texcoords":{'type':rdgeConstants.VS_ELEMENT_FLOAT2, 'bufferIndex':2, 'bufferUsage': rdgeConstants.BUFFER_STATIC},
				"a_uv":{'type':rdgeConstants.VS_ELEMENT_FLOAT2, 'bufferIndex':2, 'bufferUsage': rdgeConstants.BUFFER_STATIC}
            };
            
            primset.bufferStreams = 
            [
				model.root.data.coords,
				model.root.data.normals,
				model.root.data.uvs
            ];
            
            primset.streamUsage = 
            [
				rdgeConstants.BUFFER_STATIC,
				rdgeConstants.BUFFER_STATIC,
				rdgeConstants.BUFFER_STATIC
            ];
            
            primset.indexUsage  = rdgeConstants.BUFFER_STREAM;
            
            primset.indexBuffer = model.root.data.indices;

			renderer.createPrimitive( primset );
			
			model.root.primitive = primset;

            // generate a bounding box for this mesh
            model.root.bbox = new box();

            var numCoords = model.root.data.coords.length; var idx = 0;
            while (idx < numCoords - 2)
            {
              var thisCoord = [model.root.data.coords[idx+0], model.root.data.coords[idx+1], model.root.data.coords[idx+2]];
              model.root.bbox.addVec3(thisCoord);
              idx += 3;
            }

            this.modelMap[model.root.attribs.name] = model.root;
            
            // now that the model is load reduce the request count
            this.requestCounter--;
            
            this.onLoaded(model.root.attribs.name);
            //break;
        }

    }
}

MeshManager.prototype.isReady = function() 
{ 
	return this.readyList.length == 0; 
}

MeshManager.prototype.addOnLoadedCallback = function (callback) 
{
    this.postMeshLoadCallbackList.push(callback)
}

MeshManager.prototype.onLoaded = function ( meshName ) 
{
    for (var index = 0 in this.postMeshLoadCallbackList) 
    {
        // call the functions
        this.postMeshLoadCallbackList[index].onMeshLoaded(meshName);
    }
}

MeshManager.prototype.exportJSON = function () 
{	
	for(var m in this.modelMap)
	{
		this.modelMap[m].primitive.built = false;
	}
	
	return JSON.stringify(this.modelMap);
}

MeshManager.prototype.importJSON = function ( jsonMeshExport ) 
{
	try
	{
		var tempModelMap = JSON.parse(jsonMeshExport);
		
		for(var m in tempModelMap)
		{
			if(!this.modelMap[m])
			{
				this.modelMap[m] = tempModelMap[m];
			}
		}
		window.console.log("meshes imported");
	}catch( e )
	{
		window.console.error("error importing meshes: " + e.description );		
	}
}

/*
 *	global function for the mesh manager to make mesh file requests
 */ 
function requestMesh(mesh) 
{
    var request = new XMLHttpRequest();
    request.mesh = mesh;
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status == 200 || window.location.href.indexOf("http") == -1) {
                var mesh = eval("(" + request.responseText + ")"); //retrieve result as an JavaScript object
                mesh.ready = true;
                mesh.ctxID = request.mesh.ctxID;
                g_meshMan.readyList.push(mesh);
            }
            else {
                alert("An error has occured making the request");
            }
        }
    }

    request.open("GET", mesh.addr, true);
    request.send(null);
}
