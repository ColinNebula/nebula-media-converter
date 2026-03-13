import{Vector3 as V,Color as C,Vector2 as L,Matrix3 as S,ColorManagement as N,SRGBColorSpace as k}from"./three.module-ByEr90b5.js";class E{parse(j){let r="",u=0,v=0,A=0;const n=new V,b=new C,d=new V,M=new L,y=[];function w(e){let m=0,x=0,l=0;const f=e.geometry,t=new S,i=f.getAttribute("position"),a=f.getAttribute("normal"),p=f.getAttribute("uv"),B=f.getIndex();if(r+="o "+e.name+`
`,e.material&&e.material.name&&(r+="usemtl "+e.material.name+`
`),i!==void 0)for(let o=0,s=i.count;o<s;o++,m++)n.fromBufferAttribute(i,o),n.applyMatrix4(e.matrixWorld),r+="v "+n.x+" "+n.y+" "+n.z+`
`;if(p!==void 0)for(let o=0,s=p.count;o<s;o++,l++)M.fromBufferAttribute(p,o),r+="vt "+M.x+" "+M.y+`
`;if(a!==void 0){t.getNormalMatrix(e.matrixWorld);for(let o=0,s=a.count;o<s;o++,x++)d.fromBufferAttribute(a,o),d.applyMatrix3(t).normalize(),r+="vn "+d.x+" "+d.y+" "+d.z+`
`}if(B!==null)for(let o=0,s=B.count;o<s;o+=3){for(let c=0;c<3;c++){const g=B.getX(o+c)+1;y[c]=u+g+(a||p?"/"+(p?v+g:"")+(a?"/"+(A+g):""):"")}r+="f "+y.join(" ")+`
`}else for(let o=0,s=i.count;o<s;o+=3){for(let c=0;c<3;c++){const g=o+c+1;y[c]=u+g+(a||p?"/"+(p?v+g:"")+(a?"/"+(A+g):""):"")}r+="f "+y.join(" ")+`
`}u+=m,v+=l,A+=x}function z(e){let m=0;const x=e.geometry,l=e.type,f=x.getAttribute("position");if(r+="o "+e.name+`
`,f!==void 0)for(let t=0,i=f.count;t<i;t++,m++)n.fromBufferAttribute(f,t),n.applyMatrix4(e.matrixWorld),r+="v "+n.x+" "+n.y+" "+n.z+`
`;if(l==="Line"){r+="l ";for(let t=1,i=f.count;t<=i;t++)r+=u+t+" ";r+=`
`}if(l==="LineSegments")for(let t=1,i=t+1,a=f.count;t<a;t+=2,i=t+1)r+="l "+(u+t)+" "+(u+i)+`
`;u+=m}function W(e){let m=0;const x=e.geometry,l=x.getAttribute("position"),f=x.getAttribute("color");if(r+="o "+e.name+`
`,l!==void 0){for(let t=0,i=l.count;t<i;t++,m++)n.fromBufferAttribute(l,t),n.applyMatrix4(e.matrixWorld),r+="v "+n.x+" "+n.y+" "+n.z,f!==void 0&&(b.fromBufferAttribute(f,t),N.workingToColorSpace(b,k),r+=" "+b.r+" "+b.g+" "+b.b),r+=`
`;r+="p ";for(let t=1,i=l.count;t<=i;t++)r+=u+t+" ";r+=`
`}u+=m}return j.traverse(function(e){e.isMesh===!0&&w(e),e.isLine===!0&&z(e),e.isPoints===!0&&W(e)}),r}}export{E as OBJExporter};
