export class ShadowMap {
    fbo: WebGLFramebuffer | null = null;
    depthTexture: WebGLTexture | null = null; // Renamed for clarity
    debugTexture: WebGLTexture | null = null; // New Color Attachment
    size: number;

    constructor(size: number = 2048) {
        this.size = size;
    }

    // Accessor for the main shadow map (the depth texture)
    get texture() {
        return this.depthTexture;
    }

    public init(gl: WebGL2RenderingContext): void {
        if (this.depthTexture && this.fbo) return;

        // 1. Create Depth Texture (Standard Shadow Map)
        this.depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F,
            this.size, this.size, 0,
            gl.DEPTH_COMPONENT, gl.FLOAT, null
        );
        // Shadow map parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

        // 2. Create Debug Color Texture (Visual Output)
        this.debugTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.debugTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            this.size, this.size, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null
        );
        // Standard texture parameters (No comparison mode)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // 3. Setup FBO
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        // Attach Depth
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D, this.depthTexture, 0
        );

        // Attach Color (Debug)
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, this.debugTexture, 0
        );

        // 4. IMPORTANT: Tell WebGL we want to draw to the color attachment
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]); 
        gl.readBuffer(gl.COLOR_ATTACHMENT0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("[ShadowMap] FBO incomplete:", status.toString(16));
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    bind(gl: WebGL2RenderingContext): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.viewport(0, 0, this.size, this.size);

        // 5. IMPORTANT: Enable Color Mask so we can write to the debug texture
        gl.colorMask(true, true, true, true); 
        gl.depthMask(true);
        
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        
        // Clear Color (Black) and Depth
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
    }

    unbind(gl: WebGL2RenderingContext, originalWidth: number, originalHeight: number): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, originalWidth, originalHeight);
        gl.cullFace(gl.BACK);
        // Color mask is usually true by default in main loop, but good to be safe if you toggle it elsewhere
        gl.colorMask(true, true, true, true); 
    }
}
