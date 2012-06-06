/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage = require("montage/core/core").Montage,
    ModifierToolBase = require("js/tools/modifier-tool-base").ModifierToolBase,
    ElementsMediator = require("js/mediators/element-mediator").ElementMediator;

exports.InkBottleTool = Montage.create(ModifierToolBase, {
	_canSnap: { value: false },
	_canColor: { value: true },
    _targetedElement: { value: null },

    HandleMouseMove: {
        value : function (event)
		{
            var obj = this.application.ninja.stage.getElement(event, true);
            var cursor = "url('images/cursors/ink.png') 6 11, default";
            var canColor = true;
            if (obj)
            {
                var name = obj.nodeName;
                if ((name !== 'CANVAS') && (name !== 'DIV'))
                {
                    cursor = "url('images/cursors/ink_no.png') 6 11, default";
                    canColor = false;
                    if(this._targetedElement)
                    {
                        this._targetedElement.classList.remove("active-element-outline");
                        this._targetedElement = null;
                    }
                }
                else
                {
                    if (obj !== this._targetedElement)
                    {
                        if(this._targetedElement)
                        {
                            this._targetedElement.classList.remove("active-element-outline");
                        }
                    }
                    this._targetedElement = obj;
                    this._targetedElement.classList.add("active-element-outline");
                }

            }
            this.application.ninja.stage.drawingCanvas.style.cursor = cursor;
            this._canColor = canColor;
		}
	},

    HandleLeftButtonUp: {
        value : function () {
            //if(this._isDrawing)
			{
                this.application.ninja.stage.clearDrawingCanvas();
                this._hasDraw = false;
                this._isDrawing = false;
            }
        }
    },

    // Called by modifier tool base's HandleLeftButtonDown after updating selection (if needed)
    startDraw: {
        value: function(event) {
            this.isDrawing = true;

            if(this._canColor && this.application.ninja.selectedElements.length)
            {
                var strokeInfo = {},
                    color;
                if(this.options.useStrokeColor.checked) {
                    strokeInfo.colorInfo = {};
                    color = this.options.stroke;
                    if(color && color.color)
                    {
                        strokeInfo.colorInfo.mode = color.colorMode;
                        strokeInfo.colorInfo.color = color.color;
                    } else {
                        strokeInfo.colorInfo.mode = "nocolor";
                        strokeInfo.colorInfo.color = null;
                    }
                }

                if(this.options.useBorderWidth.checked || this.options.useBorderStyle.checked) {
                    strokeInfo.borderInfo = {};
                    if(this.options.useBorderWidth.checked) {
                        strokeInfo.borderInfo.borderWidth = this.options.borderWidth.value;
                        strokeInfo.borderInfo.borderUnits = this.options.borderWidth.units;
                    }
                    if(this.options.useBorderStyle.checked) {
                        strokeInfo.borderInfo.borderStyle = this.options.borderStyle.value;
                    }
                }

                if(this.options.useStrokeSize.checked) {
                    strokeInfo.shapeInfo = {};
                    strokeInfo.shapeInfo.strokeSize = this.options.strokeSize.value;
                    strokeInfo.shapeInfo.strokeUnits = this.options.strokeSize.units;
                }

                if(this.options.useWebGL.checked) {
                    strokeInfo.webGLInfo = {};
                    strokeInfo.webGLInfo.material = this.options.strokeMaterial.value;
                }

                if(strokeInfo.colorInfo || strokeInfo.borderInfo || strokeInfo.shapeInfo || strokeInfo.webGLInfo) {
                    ElementsMediator.setStroke(this.application.ninja.selectedElements, strokeInfo, "Change", "inkBottleTool");
                }
            }
        }
    }

});