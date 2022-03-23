class EvidenceCollection extends RenJS.Plugin {

    clueSets = null;
    clueRooms = null;
    state = null;

    onStart() {
        this.clueSets = this.game.setup.EvidenceCollection.clueSets;
        this.clueRooms = this.game.setup.EvidenceCollection.clueRooms;
        this.state = {
            clueSets: {},
            clueRooms: {},
            searching: false,
        };
        this.game.managers.logic.vars.EvidenceCollection = this.state;
    }

    onLoad(slot, data) { 
        this.state = data.vars.EvidenceCollection;
    }

    onInit(){
        // Add new point and click transition
        this.game.screenEffects.transition['Clues'] = (from, to, position, scaleX) => {
            // Transitioning from one background to another
            // Add objects to the background before showing it
            const room = to.name;
            if (this.clueRooms[room]){
                if (!this.state.clueRooms[room]){
                    this.state.clueRooms[room] = {added: {}, removed: {}};
                }
                for (const obj in this.clueRooms[room].objects){
                    if (this.state.clueRooms[room].removed[obj]){
                        continue;
                    }
                    const objAttr = this.clueRooms[room].objects[obj];
                    if (objAttr.extra){
                        continue;
                    }
                    const newObj = {
                        key: obj,
                        text: objAttr.text,
                        icon: objAttr.icon,
                        x: objAttr.x - to.width / 2,
                        y: objAttr.y - to.height / 2,
                        scene: objAttr.scene
                    };
                    this.createObject(to, newObj)
                }
            }
            
            // Objects added during runtime
            if (this.state.clueRooms[room]){
                for (const obj in this.state.clueRooms[room].added){
                    this.createObject(to, this.state.clueRooms[room].added[obj]);
                }
            }

            // enable input globally just in case
            this.game.input.enabled = true;
            // FADE TO BLACK to the new background
            return this.game.screenEffects.transition.FADETOBLACK(from, to, position, scaleX);
        }
    }

    createObject(room, obj, transition){
        // Create object in room
        if (!room.clues){
            room.clues = {
                map: {}, 
                group: this.game.add.group()
            }
            room.addChild(room.clues.group);
        }
        const btn = this.game.add.button(
            obj.x, obj.y, obj.icon,
            // button onclick callback
            async () => {
                if(!this.game.managers.story.interpreting){
                    room.clues.group.ignoreChildInput = true;
                    await this.game.managers.story.startScene(obj.scene);
                    this.game.resolveAction();
                }
            },
            this.game, 1, 0,1, 0, room.clues.group
        );
        room.clues.map[obj.key] = btn;
        if (transition){
            btn.alpha = 0;
            this.game.screenEffects.transition.FADEIN(btn);
        } else {
            // Objects are added but not clickable until activated explicitly in the story
            room.clues.group.ignoreChildInput = true;
        }
    }


    onCall(params) {
        console.log('EvidenceCollection.onCall', params);

        const room = this.game.managers.background.current;
        console.log(room.clues.map);
        this.state = this.game.managers.logic.vars.EvidenceCollection;

        if (params.fn == 'start' && room.clues){
			room.clues.group.ignoreChildInput = false;
            this.state.searching = room;
			this.game.resolveAction();
        } else if (params.fn == 'add' && !(room.clues.map[params.obj])){
            console.log('Add', params.obj);
            const roomState = this.state.clueRooms[room.name];
            const newObj = {
                key: params.obj,
                text: params.objAttr.text,
                icon: params.objAttr.icon,
                x: params.objAttr.x - room.width / 2,
                y: params.objAttr.y - room.height / 2,
                scene: params.objAttr.scene
            }
            roomState.added[params.obj] = newObj;
            // if it was previously removed, reverse that operation
            if (roomState.removed[params.obj]){
                delete roomState.removed[params.obj];
            }
            this.createObject(room, newObj, true);
            this.game.resolveAction();
		} else if (params.fn == 'remove' && room.clues.map[params.obj]) {
            console.log('Remove', params.obj);
            this.game.screenEffects.transition.FADEOUT(room.clues.map[params.obj]).then(()=>{
                const roomState = this.state.clueRooms[room.name];
                roomState.removed[params.obj] = true;
                // if it was previously added, remove it from there too
                if (roomState.added[params.obj]){
                    delete roomState.added[params.obj];
                }
                room.clues.map[params.obj].destroy();
                this.game.resolveAction();
            });
        } else {
            this.game.resolveAction();
        }
    }
}

RenJSGame.addPlugin('EvidenceCollection', EvidenceCollection)
