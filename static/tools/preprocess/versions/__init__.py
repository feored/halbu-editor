from .v99 import V99CalcsAdapter
from .v105 import V105CalcsAdapter


def get_version_adapter(data_version):
    if data_version == "v105":
        return V105CalcsAdapter()
    return V99CalcsAdapter()


def get_calcs_adapter(data_version):
    return get_version_adapter(data_version)
