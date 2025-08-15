#!/usr/bin/python3

import pymodbus.client as ModbusClient
from pymodbus import (
    FramerType,
    ModbusException,
    pymodbus_apply_logging_config,
)
import sys

def usage():
    print('Usage: ', sys.argv[0], '[EC_IP_ADDRESS]')

def main():
    modbus_ip = ""

    if len(sys.argv) == 2:
        modbus_ip = sys.argv[1]
    else:
        usage()
        sys.exit()

    client = ModbusClient.ModbusTcpClient(modbus_ip, port=502, framer=FramerType.SOCKET)
    client.connect()

    # SoC
    try:
        result = client.read_input_registers(30014, count=1, device_id=247)
    except ModbusException as exc:
        print("Received ModbusException({exc}) from library")
        client.close()
        exit(0)
    if not result.isError():
        value_int16 = client.convert_from_registers(result.registers, data_type=client.DATATYPE.INT16)
        print("SOC", value_int16 / 10.0, '%')
    else:
        print ("error=", result)
    client.close()

main()