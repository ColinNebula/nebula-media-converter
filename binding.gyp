{
  "targets": [
    {
      "target_name": "nebula_native_converter",
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "sources": [
        "native/src/main.cpp",
        "native/src/converter.cpp",
        "native/src/gpu_detector.cpp",
        "native/src/utils.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<(module_root_dir)/native/include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "-lavcodec",
            "-lavformat",
            "-lavutil",
            "-lswscale",
            "-lswresample"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }],
        ["OS=='linux'", {
          "libraries": [
            "-lavcodec",
            "-lavformat",
            "-lavutil",
            "-lswscale",
            "-lswresample"
          ],
          "cflags_cc": [
            "-std=c++17",
            "-fexceptions"
          ]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-lavcodec",
            "-lavformat",
            "-lavutil",
            "-lswscale",
            "-lswresample"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "MACOSX_DEPLOYMENT_TARGET": "10.15"
          }
        }]
      ]
    }
  ]
}
