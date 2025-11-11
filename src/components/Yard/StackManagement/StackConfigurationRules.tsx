import React from 'react';
import { Shield } from 'lucide-react';

export const StackConfigurationRules: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-blue-900 mb-2">Configuration Rules</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div><strong>Special Stacks (01, 31, 101, 103):</strong> Can only be set to 20ft containers.</div>
            <div><strong>Regular Stacks:</strong> Can be set to either 20ft or 40ft containers.</div>
            <div><strong>40ft Assignment:</strong> Only available for regular stacks that have an adjacent regular stack to form valid pairs.</div>
            <div><strong>Paired Updates:</strong> When changing a regular stack to 40ft, its adjacent pair will automatically be updated to match.</div>
            <div><strong>Valid Pairs:</strong> 03+05, 07+09, 11+13, 15+17, 19+21, 23+25, 27+29, 33+35, 37+39, 41+43, 45+47, 49+51, 53+55, 61+63, 65+67, 69+71, 73+75, 77+79, 81+83, 85+87, 89+91, 93+95, 97+99</div>
            <div><strong>Non-Adjacent Stacks:</strong> Cannot be assigned 40ft containers as they lack valid pairing partners.</div>
          </div>
        </div>
      </div>
    </div>
  );
};