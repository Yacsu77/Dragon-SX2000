#include "version.h"

#ifndef DSX_CORE_VERSION
#define DSX_CORE_VERSION "0.0.0-dev"
#endif
#ifndef DSX_CORE_PLATFORM
#define DSX_CORE_PLATFORM "unknown"
#endif
#ifndef DSX_CORE_ARCH
#define DSX_CORE_ARCH "unknown"
#endif

const char *dsx_core_version(void) { return DSX_CORE_VERSION; }
const char *dsx_core_platform(void) { return DSX_CORE_PLATFORM; }
const char *dsx_core_arch(void) { return DSX_CORE_ARCH; }
