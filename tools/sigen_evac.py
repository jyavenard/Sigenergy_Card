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

    for slave_id in range(1, 247):
        print("testing id", slave_id)
        try:
            result = client.read_input_registers(32001, count=2, device_id=slave_id)
        except ModbusException as exc:
            print("Received ModbusException({exc}) from library for id", slave_id)
            continue
        if not result.isError():
            value_uint32 = client.convert_from_registers(result.registers, data_type=client.DATATYPE.UINT32)
            print("evac found at address", slave_id)
            print("Total energy consumed", value_uint32 / 100.0, 'kWh')
            client.close()
            exit(0)
        else:
            print ("error=", result, "for id=", slave_id)

main()