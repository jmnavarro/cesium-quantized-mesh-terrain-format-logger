
function addRow(table, name, value) {
	var toCell = function(n) {
			return "<td>" + n + "</td>";
	};
	var concat = function(a, b) {
			return a + b;
	};

    var newRow = document.createElement('tr');
    if (name instanceof Array) {
    	var cells1 = name.map(toCell).reduce(concat);
    	var cells2 = value.map(toCell).reduce(concat);
	    newRow.innerHTML = cells1 + cells2;
    }
    else {
	    newRow.innerHTML = "<td>" + name + "</td><td>" + value + "</td>";
    }
    document.getElementById(table).appendChild(newRow);
    return newRow;
}

function addElement(parent, text) {
    var newItem = document.createElement('li');
    newItem.innerHTML = text;
    document.getElementById(parent).appendChild(newItem);
    return newItem;
}
    
function createTypedArrayFromArrayBuffer(numberOfVertices, sourceArray, byteOffset, length) {
    if (numberOfVertices > 64 * 1024) {
        return new Uint32Array(sourceArray, byteOffset, length);
    }

    return new Uint16Array(sourceArray, byteOffset, length);
}
    

//
// Decoding code copy-pasted from Cesium's release 1.10
//
// https://github.com/AnalyticalGraphicsInc/cesium/blob/1a6d98695be89279388220b7592d9326535305d9/Source/Core/CesiumTerrainProvider.js#L296
//
function loadQuantizedMeshTerrainData(buffer) {
    var pos = 0;
    var cartesian3Elements = 3;
    var boundingSphereElements = cartesian3Elements + 1;
    var cartesian3Length = Float64Array.BYTES_PER_ELEMENT * cartesian3Elements;
    var boundingSphereLength = Float64Array.BYTES_PER_ELEMENT * boundingSphereElements;
    var encodedVertexElements = 3;
    var encodedVertexLength = Uint16Array.BYTES_PER_ELEMENT * encodedVertexElements;
    var triangleElements = 3;
    var bytesPerIndex = Uint16Array.BYTES_PER_ELEMENT;
    var triangleLength = bytesPerIndex * triangleElements;

    var view = new DataView(buffer);

    addRow("header", "CenterX", view.getFloat64(pos, true));
    addRow("header", "CenterY", view.getFloat64(pos + 8, true));
    addRow("header", "CenterZ", view.getFloat64(pos + 16, true));

    pos += cartesian3Length;

    var minimumHeight = view.getFloat32(pos, true);
    addRow("header", "MinimumHeight", minimumHeight);
    pos += Float32Array.BYTES_PER_ELEMENT;

    var maximumHeight = view.getFloat32(pos, true);
    addRow("header", "MaximumHeight", maximumHeight);
    pos += Float32Array.BYTES_PER_ELEMENT;

    addRow("header", "BoundingSphereCenterX", view.getFloat64(pos, true));
    addRow("header", "BoundingSphereCenterY", view.getFloat64(pos + 8, true));
    addRow("header", "BoundingSphereCenterZ", view.getFloat64(pos + 16, true));
    addRow("header", "BoundingSphereCenterRadius", view.getFloat64(pos + 24, true));
    pos += boundingSphereLength;

    addRow("header", "HorizonOcclusionPointX", view.getFloat64(pos, true));
    addRow("header", "HorizonOcclusionPointY", view.getFloat64(pos + 8, true));
    addRow("header", "HorizonOcclusionPointZ", view.getFloat64(pos + 16, true));
    pos += cartesian3Length;

    var vertexCount = view.getUint32(pos, true);

    document.getElementById("verticesTitle").innerHTML = "Vertices: " + vertexCount;
    pos += Uint32Array.BYTES_PER_ELEMENT;

    var encodedVertexBuffer = new Uint16Array(buffer, pos, vertexCount * 3);
    pos += vertexCount * encodedVertexLength;

    if (vertexCount > 64 * 1024) {
        // More than 64k vertices, so indices are 32-bit.
        bytesPerIndex = Uint32Array.BYTES_PER_ELEMENT;
        triangleLength = bytesPerIndex * triangleElements;
    }

    // Decode the vertex buffer.
    var uBuffer = encodedVertexBuffer.subarray(0, vertexCount);
    var vBuffer = encodedVertexBuffer.subarray(vertexCount, 2 * vertexCount);
    var heightBuffer = encodedVertexBuffer.subarray(vertexCount * 2, 3 * vertexCount);

    var i;
    var u = 0;
    var v = 0;
    var height = 0;

    function zigZagDecode(value) {
        return (value >> 1) ^ (-(value & 1));
    }

    for (i = 0; i < vertexCount; ++i) {
        u += zigZagDecode(uBuffer[i]);
        v += zigZagDecode(vBuffer[i]);
        height += zigZagDecode(heightBuffer[i]);

        addRow("vertices", [uBuffer[i], vBuffer[i], heightBuffer[i]], [u, v, height]);

        uBuffer[i] = u;
        vBuffer[i] = v;
        heightBuffer[i] = height;
    }

    // skip over any additional padding that was added for 2/4 byte alignment
    if (pos % bytesPerIndex !== 0) {
        pos += (bytesPerIndex - (pos % bytesPerIndex));
    }

    var triangleCount = view.getUint32(pos, true);
    document.getElementById("trianglesTitle").innerHTML = "Triangles: " + triangleCount;
    pos += Uint32Array.BYTES_PER_ELEMENT;

    var indices = createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, triangleCount * triangleElements);
    pos += triangleCount * triangleLength;

    // High water mark decoding based on decompressIndices_ in webgl-loader's loader.js.
    // https://code.google.com/p/webgl-loader/source/browse/trunk/samples/loader.js?r=99#55
    // Copyright 2012 Google Inc., Apache 2.0 license.
    var highest = 0;
    for (i = 0; i < indices.length; ++i) {
        var code = indices[i];
    
        indices[i] = highest - code;
        if (code === 0) {
            ++highest;
        }
    }

    for (i = 0; i < indices.length; ) {
        addRow("triangles", [i/3], [indices[i], indices[i + 1], indices[i + 2]]);
        i += 3;
    }


    var westVertexCount = view.getUint32(pos, true);
    document.getElementById("westTitle").innerHTML = "West Vertices: " + westVertexCount;
    pos += Uint32Array.BYTES_PER_ELEMENT;
    var westIndices = createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, westVertexCount);
    pos += westVertexCount * bytesPerIndex;
    for (i = 0; i < westVertexCount; ++i) {
        addRow("west", i, westIndices[i]);
    }

    var southVertexCount = view.getUint32(pos, true);
    document.getElementById("southTitle").innerHTML = "South Vertices: " + southVertexCount;
    pos += Uint32Array.BYTES_PER_ELEMENT;
    var southIndices = createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, southVertexCount);
    pos += southVertexCount * bytesPerIndex;
    for (i = 0; i < southVertexCount; ++i) {
        addRow("south", i, southIndices[i]);
    }

    var eastVertexCount = view.getUint32(pos, true);
    document.getElementById("eastTitle").innerHTML = "East Vertices: " + eastVertexCount;
    pos += Uint32Array.BYTES_PER_ELEMENT;
    var eastIndices = createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, eastVertexCount);
    pos += eastVertexCount * bytesPerIndex;
    for (i = 0; i < eastVertexCount; ++i) {
        addRow("east", i, eastIndices[i]);
    }

    var northVertexCount = view.getUint32(pos, true);
    document.getElementById("northTitle").innerHTML = "North Vertices: " + northVertexCount;
    pos += Uint32Array.BYTES_PER_ELEMENT;
    var northIndices = createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, northVertexCount);
    pos += northVertexCount * bytesPerIndex;
    for (i = 0; i < northVertexCount; ++i) {
        addRow("north", i, northIndices[i]);
    }

    var encodedNormalBuffer;
    var waterMaskBuffer;
    while (pos < view.byteLength) {
        var extensionId = view.getUint8(pos, true);
        pos += Uint8Array.BYTES_PER_ELEMENT;
        var extensionLength = view.getUint32(pos, true);
        pos += Uint32Array.BYTES_PER_ELEMENT;

        if (extensionId === 1) {
            encodedNormalBuffer = new Uint8Array(buffer, pos, vertexCount * 2);

            for (i = 0; i < vertexCount; ) {
            	var decoded = [0,0,0];
            	var encodedX = encodedNormalBuffer[i];
            	var encodedY = encodedNormalBuffer[i+1];
                addRow("normals", [encodedX, encodedY], octDecode(encodedX, encodedY));
                i += 2;
            }

        } else if (extensionId === 2) {
            waterMaskBuffer = new Uint8Array(buffer, pos, extensionLength);
        }
        pos += extensionLength;
    }
}


// oct decoding
// =============
var octDecode = function(x, y) {
	var fromSNorm = function(value) {
		var clamp = function(value, min, max) {
			return value < min ? min : (value > max ? max : value);
		};

        return clamp(value, 0.0, 255.0) / 255.0 * 2.0 - 1.0;
	};

	var signNotZero = function(value) {
        return value < 0.0 ? -1.0 : 1.0;
    };

	var normalize = function(cartesian) {
		var magnitude = function(cartesian) {
			var magnitudeSquared = function(cartesian) {
				return cartesian[0] * cartesian[0] + cartesian[1] * cartesian[1] + cartesian[2] * cartesian[2];
			};

			return Math.sqrt(magnitudeSquared(cartesian));
		};

		var mag = magnitude(cartesian);

		cartesian[0] /= mag;
		cartesian[1] /= mag;
		cartesian[2] /= mag;

		return cartesian;
	};

	if (x < 0 || x > 255 || y < 0 || y > 255) {
		throw new DeveloperError('x and y must be a signed normalized integer between 0 and 255');
	}

	var result = [0,0,0]

	// result holds x,y,z
	result[0] = fromSNorm(x);
	result[1] = fromSNorm(y);
	result[2] = 1.0 - (Math.abs(result[0]) + Math.abs(result[1]));

	if (result[2] < 0.0) {
		var oldVX = result[0];
		result[0] = (1.0 - Math.abs(result[1])) * signNotZero(oldVX);
		result[1] = (1.0 - Math.abs(oldVX)) * signNotZero(result[1]);
	}

	return normalize(result);
};
