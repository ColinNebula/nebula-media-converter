import{Color as P,Vector3 as V,Matrix3 as W,ColorManagement as X,SRGBColorSpace as _}from"./three.module-ByEr90b5.js";class N{parse(L,O,r={}){function z(a){L.traverse(function(c){if(c.isMesh===!0||c.isPoints){const o=c,e=o.geometry;e.hasAttribute("position")===!0&&a(o,e)}})}r=Object.assign({binary:!1,excludeAttributes:[],littleEndian:!1},r);const w=r.excludeAttributes;let x=!0,y=!1,A=!1,E=!1,$=0,M=0;L.traverse(function(a){if(a.isMesh===!0){const o=a.geometry,e=o.getAttribute("position"),t=o.getAttribute("normal"),n=o.getAttribute("uv"),u=o.getAttribute("color"),b=o.getIndex();if(e===void 0)return;$+=e.count,M+=b?b.count/3:e.count/3,t!==void 0&&(y=!0),n!==void 0&&(E=!0),u!==void 0&&(A=!0)}else if(a.isPoints){const o=a.geometry,e=o.getAttribute("position"),t=o.getAttribute("normal"),n=o.getAttribute("color");$+=e.count,t!==void 0&&(y=!0),n!==void 0&&(A=!0),x=!1}});const d=new P;if(x=x&&w.indexOf("index")===-1,y=y&&w.indexOf("normal")===-1,A=A&&w.indexOf("color")===-1,E=E&&w.indexOf("uv")===-1,x&&M!==Math.floor(M))return console.error("PLYExporter: Failed to generate a valid PLY file with triangle indices because the number of indices is not divisible by 3."),null;const h=4;let v=`ply
format ${r.binary?r.littleEndian?"binary_little_endian":"binary_big_endian":"ascii"} 1.0
element vertex ${$}
property float x
property float y
property float z
`;y===!0&&(v+=`property float nx
property float ny
property float nz
`),E===!0&&(v+=`property float s
property float t
`),A===!0&&(v+=`property uchar red
property uchar green
property uchar blue
`),x===!0&&(v+=`element face ${M}
property list uchar int vertex_index
`),v+=`end_header
`;const l=new V,B=new W;let C=null;if(r.binary===!0){const a=new TextEncoder().encode(v),c=$*(4*3+(y?4*3:0)+(A?3:0)+(E?4*2:0)),o=x?M*(h*3+1):0,e=new DataView(new ArrayBuffer(a.length+c+o));new Uint8Array(e.buffer).set(a,0);let t=a.length,n=a.length+c,u=0;z(function(b,p){const f=p.getAttribute("position"),i=p.getAttribute("normal"),m=p.getAttribute("uv"),g=p.getAttribute("color"),U=p.getIndex();B.getNormalMatrix(b.matrixWorld);for(let s=0,F=f.count;s<F;s++)l.fromBufferAttribute(f,s),l.applyMatrix4(b.matrixWorld),e.setFloat32(t,l.x,r.littleEndian),t+=4,e.setFloat32(t,l.y,r.littleEndian),t+=4,e.setFloat32(t,l.z,r.littleEndian),t+=4,y===!0&&(i!=null?(l.fromBufferAttribute(i,s),l.applyMatrix3(B).normalize(),e.setFloat32(t,l.x,r.littleEndian),t+=4,e.setFloat32(t,l.y,r.littleEndian),t+=4,e.setFloat32(t,l.z,r.littleEndian),t+=4):(e.setFloat32(t,0,r.littleEndian),t+=4,e.setFloat32(t,0,r.littleEndian),t+=4,e.setFloat32(t,0,r.littleEndian),t+=4)),E===!0&&(m!=null?(e.setFloat32(t,m.getX(s),r.littleEndian),t+=4,e.setFloat32(t,m.getY(s),r.littleEndian),t+=4):(e.setFloat32(t,0,r.littleEndian),t+=4,e.setFloat32(t,0,r.littleEndian),t+=4)),A===!0&&(g!=null?(d.fromBufferAttribute(g,s),X.workingToColorSpace(d,_),e.setUint8(t,Math.floor(d.r*255)),t+=1,e.setUint8(t,Math.floor(d.g*255)),t+=1,e.setUint8(t,Math.floor(d.b*255)),t+=1):(e.setUint8(t,255),t+=1,e.setUint8(t,255),t+=1,e.setUint8(t,255),t+=1));if(x===!0)if(U!==null)for(let s=0,F=U.count;s<F;s+=3)e.setUint8(n,3),n+=1,e.setUint32(n,U.getX(s+0)+u,r.littleEndian),n+=h,e.setUint32(n,U.getX(s+1)+u,r.littleEndian),n+=h,e.setUint32(n,U.getX(s+2)+u,r.littleEndian),n+=h;else for(let s=0,F=f.count;s<F;s+=3)e.setUint8(n,3),n+=1,e.setUint32(n,u+s,r.littleEndian),n+=h,e.setUint32(n,u+s+1,r.littleEndian),n+=h,e.setUint32(n,u+s+2,r.littleEndian),n+=h;u+=f.count}),C=e.buffer}else{let a=0,c="",o="";z(function(e,t){const n=t.getAttribute("position"),u=t.getAttribute("normal"),b=t.getAttribute("uv"),p=t.getAttribute("color"),f=t.getIndex();B.getNormalMatrix(e.matrixWorld);for(let i=0,m=n.count;i<m;i++){l.fromBufferAttribute(n,i),l.applyMatrix4(e.matrixWorld);let g=l.x+" "+l.y+" "+l.z;y===!0&&(u!=null?(l.fromBufferAttribute(u,i),l.applyMatrix3(B).normalize(),g+=" "+l.x+" "+l.y+" "+l.z):g+=" 0 0 0"),E===!0&&(b!=null?g+=" "+b.getX(i)+" "+b.getY(i):g+=" 0 0"),A===!0&&(p!=null?(d.fromBufferAttribute(p,i),X.workingToColorSpace(d,_),g+=" "+Math.floor(d.r*255)+" "+Math.floor(d.g*255)+" "+Math.floor(d.b*255)):g+=" 255 255 255"),c+=g+`
`}if(x===!0){if(f!==null)for(let i=0,m=f.count;i<m;i+=3)o+=`3 ${f.getX(i+0)+a}`,o+=` ${f.getX(i+1)+a}`,o+=` ${f.getX(i+2)+a}
`;else for(let i=0,m=n.count;i<m;i+=3)o+=`3 ${a+i} ${a+i+1} ${a+i+2}
`;M+=f?f.count/3:n.count/3}a+=n.count}),C=`${v}${c}${x?`${o}
`:`
`}`}return typeof O=="function"&&requestAnimationFrame(()=>O(C)),C}}export{N as PLYExporter};
