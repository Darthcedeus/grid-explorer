"""Derived display coordinates only; original published geometry stays archived.

Independent rounding creates self-intersections. GEOS valid_output precision
reduction retains valid geometry and removes collapsed rings at the same grid.
Never use these display shapes to infer grid areas, topology or asset identity.
Requires Shapely 2.1.2.
"""
import shapely
from shapely.geometry import shape, mapping

def display_geometry(geometry):
    original = shape(geometry)
    assert original.is_valid and not original.is_empty, 'Invalid source geometry'
    display = shapely.set_precision(original, 0.00001, mode='valid_output')
    assert display.is_valid and not display.is_empty, 'Invalid display geometry'
    assert display.geom_type == original.geom_type, 'Geometry type changed'
    return mapping(display)
