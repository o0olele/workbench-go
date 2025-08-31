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

export namespace geometry {
	
	export class AABB {
	    min: math32.Vector3;
	    max: math32.Vector3;
	
	    static createFrom(source: any = {}) {
	        return new AABB(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.min = this.convertValues(source["min"], math32.Vector3);
	        this.max = this.convertValues(source["max"], math32.Vector3);
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

export namespace main {
	
	export class AgentParam {
	    Height: number;
	    Radius: number;
	
	    static createFrom(source: any = {}) {
	        return new AgentParam(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Height = source["Height"];
	        this.Radius = source["Radius"];
	    }
	}
	export class Vec3 {
	    X: number;
	    Y: number;
	    Z: number;
	
	    static createFrom(source: any = {}) {
	        return new Vec3(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.X = source["X"];
	        this.Y = source["Y"];
	        this.Z = source["Z"];
	    }
	}
	export class Bounds {
	    Min: Vec3;
	    Max: Vec3;
	
	    static createFrom(source: any = {}) {
	        return new Bounds(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Min = this.convertValues(source["Min"], Vec3);
	        this.Max = this.convertValues(source["Max"], Vec3);
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
	export class OctreeNodeExport {
	    bounds: geometry.AABB;
	    children?: OctreeNodeExport[];
	    is_leaf: boolean;
	    is_occupied: boolean;
	    depth: number;
	
	    static createFrom(source: any = {}) {
	        return new OctreeNodeExport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bounds = this.convertValues(source["bounds"], geometry.AABB);
	        this.children = this.convertValues(source["children"], OctreeNodeExport);
	        this.is_leaf = source["is_leaf"];
	        this.is_occupied = source["is_occupied"];
	        this.depth = source["depth"];
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
	export class OctreeExport {
	    root?: OctreeNodeExport;
	    max_depth: number;
	    min_size: number;
	
	    static createFrom(source: any = {}) {
	        return new OctreeExport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.root = this.convertValues(source["root"], OctreeNodeExport);
	        this.max_depth = source["max_depth"];
	        this.min_size = source["min_size"];
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
	
	export class OctreeParam {
	    Bounds: Bounds;
	    MaxDepth: number;
	    MinSize: number;
	    StepSize: number;
	
	    static createFrom(source: any = {}) {
	        return new OctreeParam(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Bounds = this.convertValues(source["Bounds"], Bounds);
	        this.MaxDepth = source["MaxDepth"];
	        this.MinSize = source["MinSize"];
	        this.StepSize = source["StepSize"];
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
	
	
	export class Triangle {
	    A: Vec3;
	    B: Vec3;
	    C: Vec3;
	
	    static createFrom(source: any = {}) {
	        return new Triangle(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.A = this.convertValues(source["A"], Vec3);
	        this.B = this.convertValues(source["B"], Vec3);
	        this.C = this.convertValues(source["C"], Vec3);
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

export namespace math32 {
	
	export class Vector3 {
	    x: number;
	    y: number;
	    z: number;
	
	    static createFrom(source: any = {}) {
	        return new Vector3(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.z = source["z"];
	    }
	}

}

