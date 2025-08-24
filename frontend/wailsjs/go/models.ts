export namespace frontend {
	
	export class FileFilter {
	    DisplayName: string;
	    Pattern: string;
	
	    static createFrom(source: any = {}) {
	        return new FileFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.DisplayName = source["DisplayName"];
	        this.Pattern = source["Pattern"];
	    }
	}

}

export namespace main {
	
	export class DebugDrawerPrimitive {
	    type: number;
	    vertices: number[][];
	
	    static createFrom(source: any = {}) {
	        return new DebugDrawerPrimitive(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.vertices = source["vertices"];
	    }
	}
	export class ServerAgentParams {
	    radius: number;
	    height: number;
	    max_speed: number;
	    max_acceleration: number;
	
	    static createFrom(source: any = {}) {
	        return new ServerAgentParams(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.radius = source["radius"];
	        this.height = source["height"];
	        this.max_speed = source["max_speed"];
	        this.max_acceleration = source["max_acceleration"];
	    }
	}
	export class ServerAgent {
	    id: number;
	    pos: number[];
	
	    static createFrom(source: any = {}) {
	        return new ServerAgent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.pos = source["pos"];
	    }
	}
	export class NavInfo {
	    primitives: DebugDrawerPrimitive[];
	    agents: ServerAgent[];
	    agent_params?: ServerAgentParams;
	
	    static createFrom(source: any = {}) {
	        return new NavInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.primitives = this.convertValues(source["primitives"], DebugDrawerPrimitive);
	        this.agents = this.convertValues(source["agents"], ServerAgent);
	        this.agent_params = this.convertValues(source["agent_params"], ServerAgentParams);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

